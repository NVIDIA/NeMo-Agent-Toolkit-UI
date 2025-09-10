export const config = {
    runtime: 'edge',
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

const handler = async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { weave_call_id, reaction_type, backendURL } = await req.json();

        if (!weave_call_id || !reaction_type) {
            return new Response('Missing required fields: weave_call_id, reaction_type', { status: 400 });
        }

        // Default backend URL if not provided
        const feedbackURL = backendURL || 'http://localhost:8000/chat_feedback';

        const response = await fetch(feedbackURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                weave_call_id,
                reaction_type,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return new Response(`Backend error: ${error}`, { status: response.status });
        }

        const result = await response.json();
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
};

export default handler;
