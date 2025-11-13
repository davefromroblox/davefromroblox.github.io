// ---------- main.js ----------

// OAuth CLIENT ID for uploads & viewing
const CLIENT_ID = "766356051386-d6248td9r49i8r83bev533f87n2e5qt3.apps.googleusercontent.com";

// Scopes for Drive access
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly";

// Google Drive folder ID
const FOLDER_ID = "1SUw_hYTnxRFTZeWodwnJy_U5r4KEIS7o"; // Replace with your actual folder ID

// Whitelisted emails allowed to upload files
const ALLOWED_UPLOADERS = [
  "anoemailthathere@gmail.com"];

let filesData = [];

// Initialize gapi for OAuth
function initClient() {
  gapi.load('client:auth2', () => {
    gapi.client.init({
      clientId: CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      scope: SCOPES
    }).then(() => {
      const authInstance = gapi.auth2.getAuthInstance();

      if (!authInstance.isSignedIn.get()) {
        authInstance.signIn().then(() => {
          checkUploadPermission();
          listFiles();
        });
      } else {
        checkUploadPermission();
        listFiles();
      }
    });
  });
}

// Check if signed-in user is allowed to upload
function checkUploadPermission() {
  const user = gapi.auth2.getAuthInstance().currentUser.get();
  const email = user.getBasicProfile().getEmail();
  if (!ALLOWED_UPLOADERS.includes(email)) {
    document.querySelector(".upload-section").style.display = "none";
  }
}

// List files from folder (all users sign-in required)
function listFiles() {
  gapi.client.drive.files.list({
    q: `'${FOLDER_ID}' in parents`,
    fields: "files(id, name, webViewLink, appProperties)"
  }).then(response => {
    filesData = response.result.files;
    populateSubjects();
    displayFiles(filesData);
  });
}

// Populate filter dropdown
function populateSubjects() {
  const subjectSet = new Set();
  filesData.forEach(file => {
    if (file.appProperties && file.appProperties.subject) {
      subjectSet.add(file.appProperties.subject);
    }
  });
  const filter = document.getElementById('subjectFilter');
  filter.innerHTML = `<option value="">--All Categories--</option>`;
  subjectSet.forEach(subject => {
    filter.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
}

// Apply filter
function applyFilter() {
  const selected = document.getElementById('subjectFilter').value;
  const filtered = selected ? filesData.filter(f => f.appProperties && f.appProperties.subject === selected) : filesData;
  displayFiles(filtered);
}

// Display files as Tailwind cards
function displayFiles(files) {
  const list = document.getElementById('fileList');
  list.innerHTML = '';
  files.forEach(file => {
    const subject = file.appProperties?.subject || 'Unknown';
    const year = file.appProperties?.year || 'N/A';

    const card = document.createElement('li');
    card.className = 'bg-white shadow-md rounded p-4 hover:shadow-lg transition';
    card.innerHTML = `
        <a href="${file.webViewLink}" target="_blank" class="font-semibold text-blue-600 hover:underline text-lg">${file.name}</a>
        <div class="mt-2 flex flex-wrap gap-2">
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">${subject}</span>
            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">${year}</span>
        </div>
    `;
    list.appendChild(card);
  });
}

// Upload file
function uploadFile() {
  const file = document.getElementById('fileInput').files[0];
  const subject = document.getElementById('subjectInput').value.trim();
  const year = document.getElementById('yearInput').value.trim();

  if (!file || !subject || !year) {
    alert("Please provide file, category, and year.");
    return;
  }

  const user = gapi.auth2.getAuthInstance().currentUser.get();
  const email = user.getBasicProfile().getEmail();
  if (!ALLOWED_UPLOADERS.includes(email)) {
    alert("You are not authorized to upload files.");
    return;
  }

  const metadata = {
    name: file.name,
    parents: [FOLDER_ID],
    appProperties: { subject, year }
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + gapi.auth.getToken().access_token }),
    body: form
  })
  .then(res => res.json())
  .then(() => {
    document.getElementById('fileInput').value = '';
    document.getElementById('subjectInput').value = '';
    document.getElementById('yearInput').value = '';
    listFiles(); // refresh
  })
  .catch(err => console.error('Upload error:', err));
}

// Initialize everything
initClient();
