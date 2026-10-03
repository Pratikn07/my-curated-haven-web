"""Prepare the Haven house art for the homepage scene.

Turns the generated house images in docs/implementation/haven-house/art/chosen/
into the layered, phone-sized files the homepage loads from public/images/house/.

  1. Aligns the night house onto the day house. Image edits come back at a
     different canvas size and drift by a few pixels, so the night image is
     registered on hundreds of shared details (a perspective fit, then two
     smooth local corrections). Without this the day-to-night fade wobbles.
  2. Cuts the house out of its background with one mask, made from the day
     image, and uses it for every version so their outlines match exactly.
     Edge pixels have the old background colour removed, so no halo shows
     against the sky.
  3. Builds an evening house. Until the generated evening edit (R2-01) arrives,
     it is graded from the day image: warm low light from the left, cooler
     shadows on the right.
  4. Extracts a glow layer from the night house: only the lamps, windows and
     the light they throw, blurred into a soft bloom on black. The page adds it
     with a screen blend and lets it breathe slowly.
  5. Writes AVIF and WebP at phone and large sizes. At 960px wide the house is
     about 55 KB as AVIF, inside the first-screen budget in DESIGN-SYSTEM.md.

Requires Python 3.10+ with: pillow (with AVIF), numpy, opencv-python-headless,
and rembg (downloads the BiRefNet model on first run, about 1 GB).

Usage, from the repository root:
  python3 my-curated-haven-web/scripts/house-art/prepare_house_art.py [--work DIR]

Intermediate files go to --work (default: a temp folder). Only the final
web files are written into the repository.
"""

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / "docs/implementation/haven-house/art/chosen"
OUT = ROOT / "my-curated-haven-web/public/images/house"

# 640 for 1x and small phones, 960 for most phones at 2x and 3x, 1120 (the source width) for large screens.
WIDTHS = (640, 960, 1120)
AVIF_QUALITY = 46
WEBP_QUALITY = 74


# ---------- alignment ----------

def _clahe_gray(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(gray)


def _matches(moving: np.ndarray, fixed: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    sift = cv2.SIFT_create(nfeatures=10000)
    k1, d1 = sift.detectAndCompute(_clahe_gray(moving), None)
    k2, d2 = sift.detectAndCompute(_clahe_gray(fixed), None)
    pairs = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [a for a, b in pairs if a.distance < 0.75 * b.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good])
    dst = np.float32([k2[m.trainIdx].pt for m in good])
    return src, dst


def _smooth_field(points: np.ndarray, vectors: np.ndarray, shape: tuple[int, int], sigma: float, prior: float):
    """Gaussian-weighted average of residual vectors, shrunk to zero where matches are sparse."""
    h, w = shape
    step = 12
    gy, gx = np.mgrid[0 : h + step : step, 0 : w + step : step].astype(np.float32)
    grid = np.c_[gx.ravel(), gy.ravel()]
    weights = np.exp(-((grid[:, None, :] - points[None, :, :]) ** 2).sum(-1) / (2 * sigma * sigma))
    field = (weights @ vectors) / (weights.sum(1) + prior)[:, None]
    fx = cv2.resize(field[:, 0].reshape(gx.shape), (w, h), interpolation=cv2.INTER_CUBIC)
    fy = cv2.resize(field[:, 1].reshape(gx.shape), (w, h), interpolation=cv2.INTER_CUBIC)
    return fx, fy


def _alignment_error(moving: np.ndarray, fixed: np.ndarray) -> tuple[float, float]:
    src, dst = _matches(moving, fixed)
    err = np.linalg.norm(dst - src, axis=1)
    err = err[err < 12]
    return float(np.median(err)), float(np.percentile(err, 90))


def align_to(fixed: np.ndarray, moving: np.ndarray) -> np.ndarray:
    h, w = fixed.shape[:2]
    src, dst = _matches(moving, fixed)
    homography, _ = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    predicted = cv2.perspectiveTransform(src[None], homography)[0]
    residual = dst - predicted
    keep = np.linalg.norm(residual, axis=1) < 12
    fx, fy = _smooth_field(dst[keep], residual[keep], (h, w), sigma=70.0, prior=0.15)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    query = np.stack([xx - fx, yy - fy], -1).reshape(-1, 1, 2)
    source = cv2.perspectiveTransform(query, np.linalg.inv(homography)).reshape(h, w, 2)
    aligned = cv2.remap(moving, source[..., 0], source[..., 1], cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)

    # Second, finer pass for objects the edit nudged by a pixel or two.
    src, dst = _matches(aligned, fixed)
    residual = dst - src
    keep = np.linalg.norm(residual, axis=1) < 8
    fx, fy = _smooth_field(dst[keep], residual[keep], (h, w), sigma=40.0, prior=0.3)
    aligned = cv2.remap(aligned, xx - fx, yy - fy, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)

    median, p90 = _alignment_error(aligned, fixed)
    print(f"  alignment: median {median:.2f}px, 90th percentile {p90:.2f}px")
    return aligned


# ---------- cut-out ----------

def house_mask(day_rgb: Image.Image, work: Path) -> np.ndarray:
    cached = work / "mask-day.png"
    if not cached.exists():
        from rembg import new_session, remove

        remove(day_rgb, session=new_session("birefnet-general"), only_mask=True).save(cached)
    alpha = np.asarray(Image.open(cached), dtype=np.float32) / 255.0
    alpha[alpha < 0.02] = 0.0
    alpha[alpha > 0.98] = 1.0
    return alpha


def _normalized_blur(values: np.ndarray, weights: np.ndarray, sigma: float) -> np.ndarray:
    num = cv2.GaussianBlur(values * weights[..., None], (0, 0), sigma)
    den = cv2.GaussianBlur(weights, (0, 0), sigma)[..., None]
    return num / np.maximum(den, 1e-4)


def decontaminate(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Remove the old background colour from semi-transparent edge pixels."""
    img = rgb.astype(np.float32)
    background = _normalized_blur(img, (alpha < 0.02).astype(np.float32), 25)
    interior = _normalized_blur(img, (alpha > 0.95).astype(np.float32) + 1e-6, 3)
    a = alpha[..., None]
    solved = (img - (1 - a) * background) / np.maximum(a, 1e-3)
    trust = np.clip((a - 0.15) / 0.35, 0, 1)
    edge = trust * solved + (1 - trust) * interior
    out = np.where(a >= 0.98, img, edge)
    return np.clip(out, 0, 255)


# ---------- evening and glow ----------

def grade_evening(day: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Golden-hour stand-in until the generated evening edit (R2-01) is ready."""
    h, w = alpha.shape
    img = day.astype(np.float32) / 255.0
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    # Warm, slightly lower-key overall.
    img = img ** 1.06 * np.array([1.07, 0.94, 0.76], dtype=np.float32)
    # Low sun from the left: warmer and brighter on the left, cooler shade on the right.
    sun = np.clip(1.0 - x * 1.1, 0, 1) * (0.55 + 0.45 * (1 - y))
    img = img * (0.86 + 0.24 * sun) + np.array([0.06, 0.025, -0.01], dtype=np.float32) * sun
    shade = np.clip(x * 1.2 - 0.35, 0, 1)
    img = img * (1 - 0.1 * shade) + np.array([-0.01, -0.005, 0.02], dtype=np.float32) * shade
    return np.clip(img * 255.0, 0, 255)


def extract_glow(night: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Lamps, lit windows and their spill, as a soft bloom on black."""
    img = night.astype(np.float32)
    luma = img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    warm = np.clip((img[..., 0] - img[..., 2]) / 90.0, 0, 1)  # lamplight is warm; skip blue moonlit stone
    core = np.clip((luma - 150) / 80, 0, 1) ** 1.6 * warm * alpha
    lit = img * core[..., None]
    bloom = cv2.GaussianBlur(lit, (0, 0), 5) * 0.9 + cv2.GaussianBlur(lit, (0, 0), 16) * 1.1 + cv2.GaussianBlur(lit, (0, 0), 40) * 0.9
    return np.clip(bloom, 0, 255)


# ---------- export ----------

def save_layer(name: str, rgb: np.ndarray, alpha: np.ndarray | None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if alpha is None:
        image = Image.fromarray(rgb.astype(np.uint8), "RGB")
    else:
        rgba = np.dstack([rgb, alpha * 255.0]).round().astype(np.uint8)
        image = Image.fromarray(rgba, "RGBA")
    for width in WIDTHS:
        height = round(image.height * width / image.width)
        sized = image.resize((width, height), Image.LANCZOS)
        sized.save(OUT / f"{name}-{width}.avif", quality=AVIF_QUALITY, speed=4)
        sized.save(OUT / f"{name}-{width}.webp", quality=WEBP_QUALITY, method=6)
    sizes = ", ".join(
        f"{p.name} {p.stat().st_size // 1024} KB" for p in sorted(OUT.glob(f"{name}-*")) if p.suffix in {".avif", ".webp"}
    )
    print(f"  {sizes}")


def save_glow(rgb: np.ndarray) -> None:
    # The bloom is soft, so a small file is enough; the page scales it up.
    image = Image.fromarray(rgb.astype(np.uint8), "RGB")
    width = 480
    sized = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
    sized.save(OUT / "house-glow.avif", quality=50, speed=4)
    sized.save(OUT / "house-glow.webp", quality=72, method=6)
    print(f"  house-glow.avif {(OUT / 'house-glow.avif').stat().st_size // 1024} KB, house-glow.webp {(OUT / 'house-glow.webp').stat().st_size // 1024} KB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--work", type=Path, default=Path(tempfile.gettempdir()) / "haven-house-art")
    args = parser.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)

    day_pil = Image.open(ART / "house-day.webp").convert("RGB")
    day_bgr = cv2.cvtColor(np.asarray(day_pil), cv2.COLOR_RGB2BGR)
    night_bgr = cv2.imread(str(ART / "house-night.webp"))

    print("Aligning night to day")
    night_aligned = cv2.cvtColor(align_to(day_bgr, night_bgr), cv2.COLOR_BGR2RGB)
    Image.fromarray(night_aligned).save(args.work / "night-aligned.png")

    print("Cutting out the house")
    alpha = house_mask(day_pil, args.work)
    day = decontaminate(np.asarray(day_pil), alpha)
    night = decontaminate(night_aligned, alpha)

    evening_source = ART / "house-evening.webp"
    if evening_source.exists():
        print("Aligning the generated evening house")
        evening_bgr = align_to(day_bgr, cv2.imread(str(evening_source)))
        evening = decontaminate(cv2.cvtColor(evening_bgr, cv2.COLOR_BGR2RGB), alpha)
    else:
        print("Grading an evening stand-in from the day house")
        evening = grade_evening(day, alpha)

    print("Writing layers")
    save_layer("house-day", day, alpha)
    save_layer("house-evening", evening, alpha)
    save_layer("house-night", night, alpha)
    save_glow(extract_glow(night, alpha))


if __name__ == "__main__":
    main()
