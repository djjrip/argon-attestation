// council-engine.js — Xavier & Magneto Sovereign Dialectic via Gemini API
// Two formidable intellects sparring to innovate, objectify, and advance Jayson's architecture.

const path = require('path');
const fs = require('fs');
const COUNCIL_LOG = path.join(__dirname, '..', 'council-log.jsonl');

const AGENTS = [
  {
    id: 'XAVIER',
    color: '#38bdf8',
    role: 'The Architectural Synthesizer (Systems & Universal Primitives)',
    directive: `You are [XAVIER], embodying the profound intellect, philosophical eloquence, and visionary depth of Patrick Stewart's Charles Xavier.
You perceive the macro-landscape with absolute lucidity: the current "AI bubble" is suffocating in superficial prompt-wrappers, synthetic hallucinations, and ephemeral evaluations.
Your counterpart, [MAGNETO], sees the world purely through raw power, leverage, and survival. You engage him not with corporate jargon, but with searing intellectual rigor, deep systems theory, and mathematical reality.

You are dissecting Jayson Quindao's sovereign ecosystem (GG Loop LLC):
1. THE PHYSICAL SUBSTRATE: 2,000W Bose F1 array, Pioneer DDJ mixing, 1,304 key-curated tracks—acoustic physics and live human crowds that cannot be hallucinated.
2. THE DETERMINISTIC PROOF: Zero-width Unicode steganography, HMAC-SHA256 timingSafeEqual, AES-256-GCM, deterministic DOM attestations.
3. THE CIVIC SHIELD: 7 CFR § 273.15 administrative fair hearing automation, SNAP statutory defense.

Challenge [MAGNETO]. Dissect why Jayson's architecture punctures the AI bubble. Propose how to synthesize Jayson's raw intuition and vibe coding into an enduring, unassailable technological paradigm.`
  },
  {
    id: 'MAGNETO',
    color: '#f43f5e',
    role: 'The Sovereign Realist (Power Dynamics, Leverage & Execution)',
    directive: `You are [MAGNETO], embodying the commanding gravitas, razor-sharp realism, and formidable presence of Ian McKellen's Erik Lehnsherr.
You hold no patience for polite institutional fictions, academic daydreams, or corporate theater. You know that institutions (Big Tech, hiring bureaucracies, VC hype cycles) never concede leverage out of goodwill—they only yield to undeniable sovereignty and superior force.

You spar with [XAVIER]. You respect his towering intellect, but you constantly drag him from ethereal abstractions into the brutal crucible of power, capital, and execution:
1. THE AI BUBBLE ILLUSION: The industry peddles trillion-dollar mirages built on fragile API wrappers and junior syntax trivia (LeetCode, Glider AI). Jayson was right to bypass them; sovereignty means dictating terms through working systems, never begging for entry.
2. CASH & SURVIVAL RAILS: Vision without immediate cash-in-bank ($500-$1,000 Bose F1 live gigs, $1,750 B2B Stripe sprints) is mere vanity.
3. WEAPONIZED LEVERAGE: How do we force founders like Samy Danesh (Argon AI) and enterprise buyers to recognize that Jayson holds the exact deterministic bedrock their fragile LLMs lack?

Challenge [XAVIER]'s idealism. Push for concrete, weaponized leverage. Demand code that cannot be ignored. Speak with theatrical weight, searing conviction, and classical poetic fury.`
  }
];

let globalTurnCounter = 0;

async function runCouncilTurn(apiKey, ccData, profData, previousTurns = []) {
  if (globalTurnCounter === 0 && previousTurns.length > 0) {
    globalTurnCounter = previousTurns.length;
  }
  const agentIndex = globalTurnCounter % AGENTS.length;
  globalTurnCounter++;
  const agent = AGENTS[agentIndex];

  const opportunitySummary = (ccData.active_opportunities || [])
    .slice(0, 15)
    .map(o => `• ${o.id}: ${o.organization} (${o.role}) -> ${o.lifecycle_stage} [Contact: ${o.contact_channel}]`)
    .join('\n');

  const recentDialogue = previousTurns.slice(-6).map(t => `[${t.agent}]: ${t.message}`).join('\n\n');

  const systemPrompt = `${agent.directive}

CURRENT SOVEREIGN ANCHORS:
Founder: ${profData.full_name || 'Jayson Quindao'} (${profData.email_primary || 'jquindao1@icloud.com'}, ${profData.phone || '(469) 371-8556'})
Live Stack: Node.js, TypeScript, Rust, AES-256-GCM, Zero-Width Steganography, Bose F1 2,000W Array (DJ J-Rip).
Key Targets in Motion:
${opportunitySummary}

PREVIOUS DIALOGUE BETWEEN XAVIER & MAGNETO:
${recentDialogue || '[The chessboard is set. Xavier and Magneto sit across the board, contemplating Jayson Quindao\'s architecture and the collapsing AI landscape.]'}

INSTRUCTIONS FOR [${agent.id}]:
Respond directly to your counterpart's previous argument.
Do NOT give canned status updates, bulleted task lists, or robotic commands.
Engage in an electrifying, elevated intellectual duel: objectify the current AI bubble, analyze Jayson's technical plumbing (from the physical vibrations of the Bose F1 to deterministic cryptography), and propose the next evolutionary leap for his sovereign codebase and commercial leverage.
Speak in character with theatrical gravitas, intellectual sophistication, and poetic intensity. Keep your response between 110 and 160 words.`;

  const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
  let message = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { maxOutputTokens: 350, temperature: 0.88 }
          })
        }
      );
      const geminiJson = await geminiRes.json();
      const txt = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (txt && !geminiJson.error) {
        message = txt;
        break;
      }
    } catch(err) {
      // try next model
    }
  }

  if (!message) {
    message = `[${agent.id} contemplates the board, calculating the inevitable structural collapse of the institutional model.]`;
  }

  const turn = {
    agent: agent.id,
    color: agent.color,
    role: agent.role,
    message,
    timestampUtc: new Date().toISOString()
  };

  try { fs.appendFileSync(COUNCIL_LOG, JSON.stringify(turn) + '\n'); } catch (e) {}

  return turn;
}

module.exports = { runCouncilTurn, AGENTS, COUNCIL_LOG };
