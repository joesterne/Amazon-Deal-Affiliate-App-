import { getAccessToken } from "./firebaseAuth";

export async function createSpreadsheet(title: string) {
  const token = await getAccessToken();
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.spreadsheetId;
}

export async function appendToSheet(spreadsheetId: string, range: string, values: any[][]) {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function createTask(title: string, notes: string, dueISO?: string) {
  const token = await getAccessToken();
  // Using the default task list for simplicity.
  const taskListId = "@default";
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      notes,
      due: dueISO
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}
