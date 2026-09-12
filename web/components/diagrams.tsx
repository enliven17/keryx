/**
 * Diagrams are inline SVG so they inherit the page's type and colour tokens and
 * stay sharp at any zoom. They scale with their container via viewBox, and every
 * label is real text, so they remain selectable and searchable.
 */

const INK = "var(--color-text)";
const DIM = "var(--color-text-dim)";
const FAINT = "var(--color-text-faint)";
const CREAM = "var(--color-cream)";
const EARN = "var(--color-earn)";
const LINE = "rgba(255,255,255,0.18)";
const SURFACE = "rgba(255,255,255,0.035)";

function Arrow({ id }: { id: string }) {
  return (
    <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0.8 L7 4 L0 7.2 Z" fill={LINE} />
    </marker>
  );
}

function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="9" fill={SURFACE} stroke={accent ?? LINE} strokeWidth="1" />
      <text x={x + w / 2} y={sub ? y + h / 2 - 4 : y + h / 2 + 4} textAnchor="middle" fill={accent ?? INK} fontSize="12.5" fontWeight="600">
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill={FAINT} fontSize="10.5" fontFamily="var(--font-mono)">
          {sub}
        </text>
      )}
    </g>
  );
}

/** End-to-end path of one impression, from the editor to a claimable balance. */
export function FlowDiagram() {
  return (
    <svg viewBox="0 0 940 330" role="img" aria-label="Keryx settlement flow" style={{ width: "100%", height: "auto" }}>
      <defs>
        <Arrow id="a1" />
      </defs>

      {/* lanes */}
      <g fontSize="10" fontWeight="600" letterSpacing="1.4" fill={FAINT}>
        <text x="0" y="14">OFF-CHAIN</text>
        <text x="330" y="14">SOURCE CHAIN · SEPOLIA</text>
        <text x="660" y="14">TARGET CHAIN · CREDITCOIN</text>
      </g>
      <g stroke={LINE} strokeDasharray="5 16">
        <line x1="315" y1="24" x2="315" y2="316" />
        <line x1="645" y1="24" x2="645" y2="316" />
      </g>

      <Box x={0} y={44} w={140} h={52} title="Claude Code" sub="spinner surface" />
      <Box x={0} y={126} w={140} h={52} title="VS Code" sub="extension" />
      <Box x={175} y={85} w={120} h={52} title="Keryx server" sub="Hono API" accent={CREAM} />
      <Box x={175} y={196} w={120} h={44} title="Neon" sub="PostgreSQL" />

      <Box x={340} y={85} w={160} h={56} title="SourceEngagement" sub="EngagementRecorded" />
      <Box x={340} y={196} w={160} h={48} title="Attestcoin prover" sub="inclusion + continuity" />

      <Box x={670} y={85} w={175} h={56} title="AttestcoinSettlement" sub="verifies, then charges" accent={CREAM} />
      <Box x={670} y={185} w={175} h={48} title="CampaignEscrow" sub="USDC held per campaign" />
      <Box x={670} y={262} w={82} h={44} title="Earner" sub="50%" accent={EARN} />
      <Box x={763} y={262} w={82} h={44} title="Treasury" sub="50%" accent={DIM} />

      <g stroke={LINE} strokeWidth="1.2" fill="none" markerEnd="url(#a1)">
        <path d="M140 70 L175 70 L175 105" />
        <path d="M140 152 L175 152 L175 130" />
        <path d="M235 137 L235 196" />
        <path d="M295 111 L340 111" />
        <path d="M420 141 L420 196" />
        <path d="M500 220 L585 220 L585 113 L670 113" />
        <path d="M757 141 L757 185" />
        <path d="M730 233 L730 262" />
        <path d="M790 233 L802 233 L802 262" />
      </g>

      <g fontSize="10" fill={DIM} fontFamily="var(--font-mono)">
        <text x="240" y="172">batch</text>
        <text x="300" y="103">anchor</text>
        <text x="426" y="172">prove</text>
        <text x="592" y="105">execute</text>
        <text x="762" y="166">charge</text>
      </g>
    </svg>
  );
}

/** Which contract may call which, and what each call is allowed to do. */
export function ContractDiagram() {
  return (
    <svg viewBox="0 0 760 300" role="img" aria-label="Keryx contract permissions" style={{ width: "100%", height: "auto" }}>
      <defs>
        <Arrow id="a2" />
      </defs>

      <Box x={280} y={0} w={200} h={54} title="CampaignEscrow" sub="owner: deployer" accent={CREAM} />
      <Box x={20} y={130} w={190} h={54} title="AuctionHouse" sub="controller" />
      <Box x={285} y={130} w={190} h={54} title="AttestcoinSettlement" sub="controller · ASC" />
      <Box x={550} y={130} w={190} h={54} title="Query verifier" sub="precompile 0x…0FD2" accent={DIM} />
      <Box x={285} y={244} w={190} h={48} title="SourceEngagement" sub="on the source chain" />

      <g stroke={LINE} strokeWidth="1.2" fill="none" markerEnd="url(#a2)">
        <path d="M115 130 L115 27 L280 27" />
        <path d="M380 130 L380 54" />
        <path d="M550 157 L475 157" />
        <path d="M380 244 L380 210" strokeDasharray="4 5" />
      </g>

      <g fontSize="10.5" fill={DIM} fontFamily="var(--font-mono)">
        <text x="128" y="80">setBid</text>
        <text x="392" y="100">charge · credit</text>
        <text x="484" y="150">verifyAndEmit</text>
        <text x="392" y="230">proved receipt</text>
      </g>

      <text x="20" y="290" fill={FAINT} fontSize="10.5">
        Only a controller moves money. Settlement becomes one after the proof verifies.
      </text>
    </svg>
  );
}

/** What an impression costs and where the money lands. */
export function RevShareDiagram() {
  return (
    <svg viewBox="0 0 700 200" role="img" aria-label="Revenue split" style={{ width: "100%", height: "auto" }}>
      <defs>
        <Arrow id="a3" />
      </defs>

      <text x="0" y="16" fill={FAINT} fontSize="10.5" fontFamily="var(--font-mono)">
        units = impressions + clicks × 50
      </text>
      <text x="0" y="34" fill={FAINT} fontSize="10.5" fontFamily="var(--font-mono)">
        cost = units × pricePerBlock ÷ 1000
      </text>

      <Box x={0} y={60} w={200} h={56} title="Campaign balance" sub="USDC in escrow" accent={CREAM} />
      <Box x={265} y={60} w={150} h={56} title="charged" sub="capped at balance" />
      <Box x={480} y={18} w={200} h={52} title="Earner" sub="50%" accent={EARN} />
      <Box x={480} y={110} w={200} h={52} title="Treasury" sub="50%" accent={DIM} />

      <g stroke={LINE} strokeWidth="1.2" fill="none" markerEnd="url(#a3)">
        <path d="M200 88 L265 88" />
        <path d="M415 88 L448 88 L448 44 L480 44" />
        <path d="M415 88 L448 88 L448 136 L480 136" />
      </g>

      <text x="0" y="182" fill={FAINT} fontSize="10.5">
        Integer division floors, and a charge never exceeds the campaign&apos;s remaining balance.
      </text>
    </svg>
  );
}
