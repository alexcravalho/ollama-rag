export function formatAndPruneMessages(rawMessages: any[], maxTurns?: number) {
  const formatted = rawMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // If no maxTurns is provided, return full message history
  if (!maxTurns || maxTurns <= 0) {
    return formatted;
  }

  return formatted.slice(-maxTurns * 2);
}
