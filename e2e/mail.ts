const mailpit = 'http://localhost:54333/api/v1';

type Summary = { ID: string };

async function search(to: string): Promise<Summary[]> {
	const response = await fetch(`${mailpit}/search?query=${encodeURIComponent(`to:"${to}"`)}`);
	const body = (await response.json()) as { messages: Summary[] };
	return body.messages;
}

/** Waits for a message to `to` in the test mail catcher and returns its text. */
export async function readMail(to: string, timeoutMs = 10_000): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const [message] = await search(to);
		if (message) {
			const response = await fetch(`${mailpit}/message/${message.ID}`);
			return ((await response.json()) as { Text: string }).Text;
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	throw new Error(`No mail arrived for ${to} within ${timeoutMs}ms`);
}

export async function mailCount(to: string): Promise<number> {
	return (await search(to)).length;
}
