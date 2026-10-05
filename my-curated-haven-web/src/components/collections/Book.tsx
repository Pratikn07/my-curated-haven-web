import Image from "next/image";
import type { ShowroomCollection } from "@/lib/collections/types";

type BookSource = Pick<ShowroomCollection, "title" | "cover" | "cloth">;

interface BookCoverProps {
  book: BookSource;
  /** next/image sizes for the cover art. */
  sizes: string;
  priority?: boolean;
  /** Pointer tilt and light sweep (mouse only, CollectionsMotion). */
  tilt?: boolean;
}

/**
 * A cloth cookbook. The cover art carries the cloth and the foil engraving;
 * the title is real text stamped into the empty lower third, so it stays
 * sharp, translatable and readable by screen readers as part of the link.
 * Without art, a plain cloth book is drawn from the book's colour.
 */
export function BookCover({ book, sizes, priority = false, tilt = false }: BookCoverProps) {
  return (
    <span className="cl-book" data-cloth={book.cloth} data-plain={book.cover ? undefined : ""} data-tilt={tilt ? "" : undefined}>
      {book.cover ? (
        <Image
          className="cl-book-art"
          src={book.cover.src}
          alt=""
          width={book.cover.width}
          height={book.cover.height}
          sizes={sizes}
          priority={priority}
        />
      ) : null}
      <span className="cl-book-title" aria-hidden="true" data-long={book.title.length > 12 ? "" : undefined}>
        {book.title}
      </span>
      <span className="cl-book-sheen" aria-hidden="true" />
    </span>
  );
}

interface OpeningBookProps {
  collection: ShowroomCollection;
}

/**
 * The chapter's book. Closed it shows the cover; on large screens GSAP swings
 * the cover open on its spine as the chapter arrives, and the first page is the
 * book's real contents.
 */
export function OpeningBook({ collection }: OpeningBookProps) {
  return (
    <div className="cl-book3d" data-cloth={collection.cloth}>
      <div className="cl-book3d-page" aria-hidden="true">
        <h3>Contents</h3>
        <ol>
          {collection.recipes.map((recipe, index) => (
            <li key={recipe.slug}>
              <span>{index + 1}</span>
              <span>{recipe.title}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="cl-book3d-cover">
        <BookCover book={collection} sizes="(min-width: 1024px) 19rem, 62vw" />
        <span className="cl-book3d-inside" aria-hidden="true" />
      </div>
    </div>
  );
}
