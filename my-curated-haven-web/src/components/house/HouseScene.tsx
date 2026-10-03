/**
 * Placeholder drawing of the homepage house (400 × 380, portrait for phones).
 * Colours come from the --hs-* tokens in house.css, so the sky and lamps follow
 * the visitor's time of day. Room positions match `area` in config/house-rooms.ts.
 * Purely decorative: room names, status and actions live in HTML around it.
 */
const FAIRY_LIGHTS: [number, number][] = [
  [63, 139.4], [87.5, 140.5], [112, 139.4], [138, 139.4], [162.5, 140.5], [187, 139.4],
  [213, 139.4], [237.5, 140.5], [262, 139.4], [288, 139.4], [312.5, 140.5], [337, 139.4],
];

const BUNTING: [number, number, string][] = [
  [139.5, 106.6, "hs-clay"], [156.8, 109.8, "hs-gold"], [175.5, 112, "hs-sage"], [194.2, 112.9, "hs-lilac"],
  [211.5, 112.8, "hs-clay"], [230.2, 111.4, "hs-gold"], [249, 108.8, "hs-sage"], [264.8, 105.7, "hs-lilac"],
];

const FLOWERS: [number, number, string][] = [
  [84, 348, "hs-clay"], [98, 346, "hs-lilac"], [112, 349, "hs-gold"],
  [126, 347, "hs-clay"], [140, 349, "hs-lilac"], [154, 347, "hs-gold"],
];

export default function HouseScene() {
  return (
    <svg className="hs-svg" viewBox="0 0 400 380" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--hs-sky-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--hs-sky-bottom)" }} />
        </linearGradient>
        <radialGradient id="hs-lamp">
          <stop offset="0" style={{ stopColor: "var(--hs-glow)", stopOpacity: 0.95 }} />
          <stop offset="1" style={{ stopColor: "var(--hs-glow)", stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id="hs-orb-glow">
          <stop offset="0" style={{ stopColor: "var(--hs-orb)", stopOpacity: 0.6 }} />
          <stop offset="1" style={{ stopColor: "var(--hs-orb)", stopOpacity: 0 }} />
        </radialGradient>
        <pattern id="hs-stars-wall" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" className="hs-library" />
          <path className="hs-lilac" opacity="0.22" d="M9 4l1.1 2.4 2.6.3-1.9 1.8.5 2.6-2.3-1.3-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z" />
        </pattern>
        <pattern id="hs-stripes" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" className="hs-nursery" />
          <rect width="4" height="12" className="hs-clay" opacity="0.13" />
        </pattern>
        <pattern id="hs-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" className="hs-shelf" />
          <circle cx="7" cy="7" r="1.4" className="hs-sage" opacity="0.3" />
        </pattern>
        <pattern id="hs-tiles" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" className="hs-trim" />
          <rect width="6" height="6" className="hs-clay" opacity="0.3" />
          <rect x="6" y="6" width="6" height="6" className="hs-clay" opacity="0.3" />
        </pattern>
        <pattern id="hs-gingham" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" className="hs-trim" />
          <rect width="3" height="6" className="hs-clay" opacity="0.35" />
          <rect width="6" height="3" className="hs-clay" opacity="0.35" />
        </pattern>
        <pattern id="hs-shingle" width="16" height="10" patternUnits="userSpaceOnUse">
          <rect width="16" height="10" className="hs-roof" />
          <path className="hs-shingle" d="M0 10a8 8 0 0 1 16 0M-8 5a8 8 0 0 1 16 0M8 5a8 8 0 0 1 16 0" />
        </pattern>
      </defs>

      {/* Sky, hills and garden */}
      <rect width="400" height="380" fill="url(#hs-sky)" />
      <circle className="hs-orb-glow" cx="336" cy="56" r="52" fill="url(#hs-orb-glow)" />
      <circle className="hs-orb" cx="336" cy="56" r="19" />
      <g className="hs-stars">
        <circle cx="30" cy="40" r="1.6" /><circle cx="84" cy="78" r="1.2" /><circle cx="132" cy="30" r="1.6" />
        <circle cx="256" cy="22" r="1.2" /><circle cx="376" cy="120" r="1.5" /><circle cx="18" cy="150" r="1.2" />
        <circle cx="296" cy="96" r="1.1" /><circle cx="170" cy="62" r="1.2" /><circle cx="380" cy="22" r="1.1" />
      </g>
      <g className="hs-cloud">
        <ellipse cx="64" cy="64" rx="26" ry="9" /><ellipse cx="78" cy="57" rx="15" ry="9" /><ellipse cx="52" cy="59" rx="12" ry="7" />
        <ellipse cx="300" cy="118" rx="20" ry="6" /><ellipse cx="311" cy="113" rx="11" ry="6" />
      </g>
      <path className="hs-hill-back" d="M0 300 Q70 262 150 290 T300 276 T400 268 V380 H0Z" />
      <path className="hs-hill-front" d="M0 326 Q110 298 220 318 T400 312 V380 H0Z" />
      <rect className="hs-ground" x="0" y="344" width="400" height="36" />
      <rect className="hs-wood" x="24" y="288" width="7" height="58" rx="2" />
      <circle className="hs-tree" cx="28" cy="272" r="21" /><circle className="hs-tree" cx="13" cy="290" r="13" />
      <circle className="hs-tree" cx="42" cy="288" r="15" /><circle className="hs-tree-dark" cx="36" cy="296" r="9" />
      <circle className="hs-tree-dark" cx="20" cy="276" r="7" />
      <circle className="hs-clay" cx="16" cy="284" r="2.2" /><circle className="hs-clay" cx="38" cy="268" r="2.2" />
      <circle className="hs-clay" cx="44" cy="292" r="2.2" />
      <circle className="hs-tree" cx="376" cy="338" r="13" /><circle className="hs-tree" cx="392" cy="334" r="11" />
      <circle className="hs-tree-dark" cx="384" cy="328" r="9" />
      <circle className="hs-gold" cx="370" cy="334" r="2" /><circle className="hs-gold" cx="388" cy="340" r="2" />
      <ellipse className="hs-stone" cx="352" cy="352" rx="9" ry="3" /><ellipse className="hs-stone" cx="366" cy="362" rx="9" ry="3" />
      <ellipse className="hs-stone" cx="384" cy="372" rx="10" ry="3.5" />
      <path className="hs-stem" d="M84 358v-9M98 358v-11M112 358v-8M126 358v-10M140 358v-8M154 358v-10" />
      {FLOWERS.map(([cx, cy, tone]) => (
        <circle key={`${cx}-${cy}`} className={tone} cx={cx} cy={cy} r="3.2" />
      ))}

      {/* Chimney, roof and walls */}
      <rect className="hs-stone" x="270" y="46" width="22" height="64" />
      <rect className="hs-trim" x="266" y="41" width="30" height="7" rx="2" />
      <circle className="hs-smoke" cx="284" cy="32" r="5" /><circle className="hs-smoke" cx="291" cy="21" r="6" />
      <circle className="hs-smoke" cx="300" cy="9" r="7" />
      <polygon points="200,22 356,134 44,134" fill="url(#hs-shingle)" />
      <polyline className="hs-fascia" points="44,134 200,22 356,134" />
      <rect className="hs-wall" x="58" y="128" width="284" height="210" />

      {/* Library, in the attic */}
      <g className="hs-room" data-room="library">
        <polygon points="200,58 318,128 82,128" fill="url(#hs-stars-wall)" />
        <circle className="hs-trim" cx="200" cy="86" r="13" /><circle className="hs-window" cx="200" cy="86" r="10" />
        <path className="hs-trim-line" d="M200 76v20M190 86h20" /><circle className="hs-star" cx="195" cy="82" r="1.3" />
        <path className="hs-thin" d="M128 104Q200 122 272 104" />
        {BUNTING.map(([x, y, tone]) => (
          <polygon key={x} className={tone} points={`${x - 4.5},${y} ${x + 4.5},${y} ${x},${y + 8}`} />
        ))}
        <rect className="hs-wood" x="112" y="112" width="30" height="16" rx="1.5" />
        <rect className="hs-trim" x="112" y="119.5" width="30" height="1.5" />
        <rect className="hs-clay" x="114" y="113" width="4" height="6" /><rect className="hs-sage" x="119" y="113" width="3" height="6" />
        <rect className="hs-lilac" x="123" y="114" width="4" height="5" /><rect className="hs-gold" x="128" y="113" width="3" height="6" />
        <rect className="hs-clay" x="132" y="114" width="4" height="5" /><rect className="hs-sage" x="137" y="113" width="3" height="6" />
        <rect className="hs-lilac" x="114" y="121" width="4" height="7" /><rect className="hs-gold" x="119" y="121" width="3" height="7" />
        <rect className="hs-clay" x="123" y="122" width="5" height="6" /><rect className="hs-sage" x="129" y="121" width="3" height="7" />
        <rect className="hs-lilac" x="133" y="122" width="4" height="6" />
        <ellipse className="hs-lilac" cx="195" cy="127.5" rx="34" ry="2.5" opacity="0.45" />
        <path className="hs-clay" d="M172 128v-14q0-6 6-6h22q6 0 6 6v14z" />
        <rect className="hs-clay" x="168" y="116" width="7" height="12" rx="3" opacity="0.8" />
        <rect className="hs-clay" x="203" y="116" width="7" height="12" rx="3" opacity="0.8" />
        <rect className="hs-gold" x="179" y="112" width="11" height="7" rx="2.5" />
        <rect className="hs-paper" x="188" y="117" width="6" height="4" />
        <rect className="hs-paper hs-page" x="194" y="117" width="6" height="4" />
        <line className="hs-line" x1="228" y1="104" x2="228" y2="128" />
        <path className="hs-sage" d="M221 105h14l-3-9h-8z" />
        <circle className="hs-glow" cx="228" cy="110" r="26" />
        <rect className="hs-wood" x="252" y="102" width="17" height="26" rx="2" />
        <circle className="hs-gold" cx="265" cy="116" r="1.3" />
        <rect className="hs-door-light" x="252" y="126" width="17" height="2" />
        <polygon className="hs-outline" points="200,58 318,128 82,128" />
      </g>

      <rect className="hs-wood" x="58" y="128" width="284" height="8" />

      {/* Nursery */}
      <g className="hs-room" data-room="nursery">
        <rect x="66" y="136" width="130" height="90" fill="url(#hs-stripes)" />
        <path className="hs-trim" d="M150 182v-22a16 16 0 0 1 32 0v22z" />
        <path className="hs-window" d="M153.5 179v-19a12.5 12.5 0 0 1 25 0v19z" />
        <path className="hs-star" d="M170 152a5 5 0 1 0 4 8 4.5 4.5 0 1 1-4-8z" />
        <circle className="hs-star" cx="159" cy="170" r="1" />
        <rect className="hs-trim" x="147" y="181" width="38" height="3" rx="1" />
        <rect className="hs-trim" x="74" y="146" width="18" height="15" rx="1.5" />
        <path className="hs-clay" opacity="0.8" d="M83 158s-4.5-2.7-4.5-5.5a2.3 2.3 0 0 1 4.5-.9 2.3 2.3 0 0 1 4.5.9c0 2.8-4.5 5.5-4.5 5.5z" />
        <line className="hs-thin" x1="108" y1="136" x2="108" y2="152" />
        <g className="hs-mobile">
          <line className="hs-line" x1="94" y1="152" x2="122" y2="152" />
          <path className="hs-thin" d="M96 152v7M108 152v10M120 152v6" />
          <path className="hs-gold" d="M96 159a4 4 0 1 0 3.3 6 3.4 3.4 0 1 1-3.3-6z" />
          <path className="hs-lilac" d="M108 162l1.4 2.9 3.2.4-2.3 2.1.6 3.1-2.9-1.6-2.9 1.6.6-3.1-2.3-2.1 3.2-.4z" />
          <ellipse className="hs-trim" cx="120" cy="161" rx="4.5" ry="3" />
        </g>
        <ellipse className="hs-clay" cx="110" cy="225" rx="38" ry="2.5" opacity="0.3" />
        <rect className="hs-lilac" x="80" y="204" width="56" height="11" rx="3" />
        <rect className="hs-trim" x="82" y="201" width="16" height="6" rx="3" />
        <g className="hs-wood">
          <rect x="76" y="190" width="4" height="36" rx="1.5" /><rect x="136" y="190" width="4" height="36" rx="1.5" />
          <rect x="76" y="194" width="64" height="3.5" rx="1.5" /><rect x="76" y="215" width="64" height="3.5" rx="1.5" />
          <rect x="88" y="197.5" width="2.2" height="17.5" /><rect x="98" y="197.5" width="2.2" height="17.5" />
          <rect x="108" y="197.5" width="2.2" height="17.5" /><rect x="118" y="197.5" width="2.2" height="17.5" />
          <rect x="128" y="197.5" width="2.2" height="17.5" />
        </g>
        <circle className="hs-wood" cx="166" cy="217" r="7" /><circle className="hs-wood" cx="166" cy="207" r="5" />
        <circle className="hs-wood" cx="162" cy="203" r="2.2" /><circle className="hs-wood" cx="170" cy="203" r="2.2" />
        <circle className="hs-door-light" cx="188" cy="212" r="3" />
        <rect className="hs-outline" x="66" y="136" width="130" height="90" />
      </g>

      {/* Shelf */}
      <g className="hs-room" data-room="shelf">
        <rect x="204" y="136" width="130" height="90" fill="url(#hs-dots)" />
        <rect className="hs-trim" x="294" y="146" width="32" height="38" rx="2" />
        <rect className="hs-window" x="297" y="149" width="26" height="32" />
        <path className="hs-trim-line" d="M310 149v32M297 165h26" />
        <line className="hs-line" x1="290" y1="145" x2="330" y2="145" />
        <path className="hs-clay hs-curtain" opacity="0.85" d="M291 145h11q-3 21 1 42h-12z" />
        <rect className="hs-wood" x="212" y="174" width="72" height="3.5" rx="1.5" />
        <rect className="hs-wood" x="212" y="202" width="72" height="3.5" rx="1.5" />
        <rect className="hs-trim" x="216" y="160" width="10" height="14" rx="2.5" />
        <rect className="hs-wood" x="215" y="158" width="12" height="3" rx="1" />
        <rect className="hs-gold" x="230" y="163" width="18" height="11" rx="2" />
        <path className="hs-thin-light" d="M232 167h14M232 171h14" />
        <rect className="hs-clay" x="252" y="165" width="9" height="9" rx="1.5" />
        <circle className="hs-tree" cx="254.5" cy="162" r="3.2" /><circle className="hs-tree" cx="259" cy="161" r="3.2" />
        <path className="hs-vine" d="M259 176q4 9-1 19" />
        <ellipse className="hs-tree" cx="261" cy="183" rx="2.2" ry="1.3" /><ellipse className="hs-tree" cx="257" cy="190" rx="2.2" ry="1.3" />
        <rect className="hs-trim" x="268" y="163" width="9" height="11" rx="2" />
        <rect className="hs-sage" x="216" y="186" width="18" height="5" rx="2" />
        <rect className="hs-clay" x="215" y="191" width="20" height="5" rx="2" opacity="0.75" />
        <rect className="hs-lilac" x="214" y="196" width="22" height="6" rx="2" />
        <rect className="hs-gold" x="242" y="190" width="4" height="12" /><rect className="hs-lilac" x="247" y="191" width="4" height="11" />
        <rect className="hs-clay" x="252" y="189" width="5" height="13" />
        <circle className="hs-trim" cx="270" cy="196" r="5.5" />
        <rect className="hs-gold" x="214" y="210" width="24" height="16" rx="3" />
        <path className="hs-thin-light" d="M217 215h18M217 220h18" />
        <rect className="hs-clay" x="304" y="209" width="14" height="17" rx="3" />
        <ellipse className="hs-tree" cx="306" cy="198" rx="5" ry="9" transform="rotate(-25 306 198)" />
        <ellipse className="hs-tree-dark" cx="316" cy="197" rx="5" ry="10" transform="rotate(22 316 197)" />
        <ellipse className="hs-tree" cx="311" cy="192" rx="4" ry="8.5" />
        <rect className="hs-outline" x="204" y="136" width="130" height="90" />
      </g>

      <rect className="hs-wall" x="196" y="136" width="8" height="90" />
      <rect className="hs-wood" x="58" y="226" width="284" height="8" />

      {/* Kitchen */}
      <g className="hs-room" data-room="kitchen">
        <rect className="hs-kitchen" x="66" y="234" width="268" height="100" />
        <rect className="hs-wood" x="66" y="328" width="268" height="6" opacity="0.55" />
        <rect className="hs-trim" x="76" y="250" width="54" height="40" rx="2" />
        <rect className="hs-window" x="79.5" y="253.5" width="47" height="33" />
        <path className="hs-trim-line" d="M103 253.5v33M79.5 270h47" />
        <rect x="74" y="247" width="58" height="8" rx="1.5" fill="url(#hs-gingham)" />
        <rect className="hs-trim" x="72" y="289" width="62" height="3.5" rx="1" />
        <rect className="hs-clay" x="114" y="281" width="8" height="8" rx="1.5" />
        <circle className="hs-tree" cx="116" cy="278" r="3" /><circle className="hs-tree" cx="121" cy="277" r="3" />
        <rect className="hs-wood" x="146" y="270" width="58" height="3" rx="1.5" />
        <circle className="hs-trim" cx="154" cy="263" r="6" /><circle className="hs-clay" cx="154" cy="263" r="2.6" opacity="0.5" />
        <circle className="hs-trim" cx="166" cy="263" r="6" /><circle className="hs-sage" cx="166" cy="263" r="2.6" opacity="0.5" />
        <rect className="hs-trim" x="176" y="259" width="8" height="11" rx="2" />
        <rect className="hs-gold" x="188" y="262" width="8" height="8" rx="1.5" />
        <rect x="142" y="278" width="158" height="22" fill="url(#hs-tiles)" />
        <line className="hs-line" x1="250" y1="234" x2="250" y2="246" />
        <path className="hs-sage" d="M241 251h18l-3-7h-12z" />
        <circle className="hs-glow" cx="250" cy="268" r="52" />
        <rect className="hs-wood" x="142" y="302" width="158" height="32" />
        <rect className="hs-trim" x="139" y="298" width="164" height="4.5" rx="1.5" />
        <path className="hs-thin-light" d="M181 306v24M221 306v24M261 306v24" />
        <circle className="hs-gold" cx="176" cy="316" r="1.4" /><circle className="hs-gold" cx="186" cy="316" r="1.4" />
        <circle className="hs-gold" cx="216" cy="316" r="1.4" /><circle className="hs-gold" cx="226" cy="316" r="1.4" />
        <path className="hs-trim" d="M150 298a12 7.5 0 0 0 24 0z" />
        <circle className="hs-gold" cx="156" cy="294" r="4" /><circle className="hs-clay" cx="163" cy="292" r="4" />
        <circle className="hs-gold" cx="169" cy="295" r="3.4" />
        <rect className="hs-wood" x="182" y="293" width="28" height="5" rx="2" />
        <rect className="hs-clay" x="236" y="282" width="28" height="16" rx="4" />
        <rect className="hs-object" x="233" y="279" width="34" height="3.5" rx="1.5" />
        <rect className="hs-object" x="247" y="276" width="6" height="3.5" rx="1.5" />
        <g className="hs-steam">
          <path d="M243 272q-4-6 0-12q4-6 0-12" /><path d="M250 270q-4-6 0-12q4-6 0-12" /><path d="M257 272q-4-6 0-12q4-6 0-12" />
        </g>
        <path className="hs-legs" d="M88 334l5-27M110 334l-5-27" />
        <rect className="hs-sage" x="88" y="285" width="23" height="20" rx="6" />
        <rect className="hs-wood" x="86" y="304" width="27" height="4.5" rx="1.5" />
        <rect className="hs-trim" x="81" y="300" width="36" height="3.5" rx="1.5" />
        <path className="hs-wood" d="M308 334v-52a12 12 0 0 1 24 0v52z" />
        <circle className="hs-window" cx="320" cy="282" r="5" />
        <circle className="hs-wreath" cx="320" cy="304" r="6" />
        <circle className="hs-gold" cx="328" cy="314" r="1.7" />
        <ellipse className="hs-clay" cx="220" cy="332" rx="50" ry="2.5" opacity="0.28" />
        <rect className="hs-outline" x="66" y="234" width="268" height="100" />
      </g>

      <rect className="hs-frame" x="58" y="128" width="284" height="206" />
      <rect className="hs-stone" x="54" y="334" width="292" height="10" rx="3" />
      <path className="hs-thin" d="M50 136q37.5 9 75 0t75 0t75 0t75 0" />
      {FAIRY_LIGHTS.map(([cx, cy]) => (
        <g key={cx}>
          <circle className="hs-bulb-glow" cx={cx} cy={cy} r="4.5" />
          <circle className="hs-bulb" cx={cx} cy={cy} r="1.8" />
        </g>
      ))}
    </svg>
  );
}
