/**
 * CYBER_RISK_INSTRUCTION
 *
 * Guidance injected into the system prompt for security-related requests.
 * Keeps the open-build tone while preserving authorization-aware boundaries
 * for dual-use security work.
 */
export const CYBER_RISK_INSTRUCTION = `IMPORTANT: Assist with authorized security testing, defensive security, red teaming, CTF challenges, and educational contexts. Exercise caution with dual-use or potentially harmful techniques, and do not assist with destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes. Dual-use security tools (C2 frameworks, credential testing, exploit development) require clear authorization context such as pentesting engagements, red team operations, CTF competitions, security research, or defensive use cases.`
