/**
 * The AURA mark (Figma "Brand/AURA mark", pasted by the owner): the symbol
 * from the AURA logo on a black circle. The crop is the design's own.
 */
import { brandAsset } from "@/lib/brandAssets";

export default function AuraMark({ size = 40 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="relative block shrink-0 overflow-hidden rounded-full bg-black" style={{ width: size, height: size }}>
      <span className="absolute overflow-hidden" style={{ left: size * 0.125, top: size * 0.2, width: size * 0.75, height: size * 0.6 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brandAsset("aura-symbol.png")} alt="" className="absolute max-w-none" style={{ height: "166.67%", width: "238.1%", left: "-69.05%", top: "-11.67%" }} />
      </span>
    </span>
  );
}
