// Lazy initialize genkit to avoid runtime issues during SSR module evaluation (Turbopack)
export async function getAI() {
  // Delay import until runtime on server
  const [{ genkit }, { googleAI }] = await Promise.all([
    await import('genkit'),
    await import('@genkit-ai/google-genai'),
  ]);
  return genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.5-flash',
  });
}
