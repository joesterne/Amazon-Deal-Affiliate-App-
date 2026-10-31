import { getAccessToken } from "./firebaseAuth";

// Shared Workspace request path: a missing token used to be sent literally as
// "Bearer null", and a non-JSON error body (e.g. a 401 HTML page) made
// res.json() throw a raw SyntaxError instead of the API's error.
async function workspaceFetch(url: string, init: RequestInit) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not signed in: Google Workspace access is missing or expired. Please sign in again.");
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body; handled by the status check below.
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || `Google Workspace request failed (${res.status})`);
  }
  if (data?.error) throw new Error(data.error.message);
  return data;
}

export async function createSpreadsheet(title: string) {
  const data = await workspaceFetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });
  return data.spreadsheetId;
}

export async function appendToSheet(spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  return workspaceFetch(url, {
    method: "POST",
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values
    })
  });
}

export async function createTask(title: string, notes: string, dueISO?: string) {
  // Using the default task list for simplicity.
  const taskListId = "@default";
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`;

  return workspaceFetch(url, {
    method: "POST",
    body: JSON.stringify({
      title,
      notes,
      due: dueISO
    })
  });
}
