# ADO → GitHub Integration

Automatically create GitHub Issues when Azure DevOps work items change state. This project consists of two repositories that work together to bridge Azure DevOps and GitHub.

## Architecture

```
Azure DevOps          Azure Function                    GitHub
┌──────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐
│ Work Item │───>│ ado-feature-trigger-     │───>│ ado-action-trigger       │
│ Updated   │    │ function (this repo)     │    │ (GitHub Actions workflow) │
│           │    │                         │    │                          │
│ Service   │    │ Receives webhook,       │    │ Listens for              │
│ Hook      │    │ sends repository_dispatch│    │ repository_dispatch,     │
└──────────┘    └─────────────────────────┘    │ creates GitHub Issue     │
                                                └──────────────────────────┘
```

## Repositories

| Repository | Purpose |
|---|---|
| [**ado-feature-trigger-function**](https://github.com/ChristinaPa/ado-feature-trigger-function) (this repo) | Azure Function that receives Azure DevOps webhooks and fires a GitHub `repository_dispatch` event |
| [**ado-action-trigger**](https://github.com/ChristinaPa/ado-action-trigger) | GitHub Actions workflow that listens for the dispatch event and creates a GitHub Issue |

## End-to-End Flow

1. A work item's state changes in **Azure DevOps** (e.g. moved to *Done*).
2. An ADO **Service Hook** (Web Hooks) sends a POST request to this **Azure Function**.
3. The function extracts the `workItemId` and `newState` from the payload.
4. If a state change is detected, the function calls the **GitHub API** to send a `repository_dispatch` event with type `ado_workitem_state_changed` to the [ado-action-trigger](https://github.com/ChristinaPa/ado-action-trigger) repo.
5. The GitHub Actions workflow in **ado-action-trigger** picks up the event and **creates a GitHub Issue** with the work item details.

### Dispatch Payload

The Azure Function sends the following payload to GitHub:

```json
{
  "event_type": "ado_workitem_state_changed",
  "client_payload": {
    "workItemId": "123",
    "newState": "Done"
  }
}
```

### Resulting GitHub Issue

The workflow creates an issue titled:

> ADO Work Item 123 moved to Done

---

## Azure Function Setup (this repo)

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- A GitHub personal access token with `repo` scope

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `local.settings.json`:

   ```json
   {
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "GITHUB_OWNER": "<your-github-org-or-user>",
       "GITHUB_REPO": "<your-repo-name>",
       "GITHUB_TOKEN": "<your-personal-access-token>"
     }
   }
   ```

   | Variable | Description |
   |---|---|
   | `GITHUB_OWNER` | GitHub org or username that owns the **ado-action-trigger** repo |
   | `GITHUB_REPO` | Repository name (e.g. `ado-action-trigger`) |
   | `GITHUB_TOKEN` | Personal access token with `repo` scope |

3. Run locally:

   ```bash
   npm start
   ```

## Configuring the Azure DevOps Webhook

1. In your Azure DevOps project, go to **Project Settings → Service Hooks**.
2. Create a new **Web Hooks** subscription.
3. Select the **Work item updated** event (and optionally filter by area path, work item type, etc.).
4. Set the URL to your function endpoint:
   - Local: `http://localhost:7071/api/devops-workitem-webhook?code=<function-key>`
   - Deployed: `https://<your-function-app>.azurewebsites.net/api/devops-workitem-webhook?code=<function-key>`

## GitHub Actions Workflow (ado-action-trigger repo)

The [ado-action-trigger](https://github.com/ChristinaPa/ado-action-trigger) repo contains a workflow at `.github/workflows/ado-feature.yml` that:

- Triggers on `repository_dispatch` events of type `ado_workitem_state_changed`
- Uses `actions/github-script` to create a GitHub Issue with the work item ID and new state

No additional setup is needed beyond ensuring the repository's **Settings → Actions → General → Workflow permissions** allow issue creation.

## Project Structure

```
host.json                          # Azure Functions host configuration
local.settings.json                # Local app settings / environment variables
package.json                       # Node.js project metadata
devops-workitem-webhook/
  function.json                    # Function bindings (HTTP trigger)
  index.js                         # Webhook handler
```
