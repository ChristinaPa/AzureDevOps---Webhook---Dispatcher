module.exports = async function (context, req) {

    context.log("ADO Webhook received.");

    const payload = req.body;
    const resource = payload?.resource;

    const workItemId = resource?.workItemId || resource?.id;
    const newState = resource?.fields?.["System.State"]?.newValue;

    context.log("WorkItemId:", workItemId);
    context.log("NewState:", newState);

    // If state wasn't part of this update → do nothing
    if (!newState) {
        context.log("No state change detected — exiting.");
        context.res = { status: 200 };
        return;
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    context.log(`Calling GitHub for ${owner}/${repo} ...`);

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/dispatches`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                event_type: "ado_workitem_state_changed",
                client_payload: {
                    workItemId,
                    newState
                }
            })
        }
    );

    context.log("GitHub response status:", response.status);

    if (!response.ok) {
        const body = await response.text();
        context.log("GitHub error body:", body);
    }

    context.res = {
        status: 200,
        body: "GitHub dispatch attempted"
    };
};