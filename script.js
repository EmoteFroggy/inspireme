let history = [];
let currentImageIndex = -1;
let folders = [];
let selectedImages = new Set();
let isSelectionMode = false;
let draggedImage = null;
let folderToDelete = null;
let renamingFolderId = null;
let selectedFolderId = 'all';
let menuOpen = false;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  if (history.length === 0) generateNew();
});

function loadData() {
  const savedData = localStorage.getItem('inspiroData');
  if (savedData) {
    const data = JSON.parse(savedData);
    history = data.history || [];
    folders = data.folders || [];
    currentImageIndex = data.currentIndex || -1;
  }

  if (!folders.some((f) => f.id === 'all')) {
    folders.unshift({
      id: 'all',
      name: 'All Images',
      images: [],
      isDefault: true,
    });
  }
  updateUI();
}

function saveData() {
  const data = {
    version: 2,
    history,
    folders: folders.filter((f) => f.id !== 'all'),
    currentIndex: currentImageIndex,
  };
  localStorage.setItem('inspiroData', JSON.stringify(data));
}

// Image Generation
async function generateNew() {
  const generateBtn = document.getElementById('generateBtn');
  try {
    generateBtn.disabled = true;
    const response = await fetch('https://inspirobot.me/api?generate=true');
    const imageUrl = await response.text();
    history.unshift(imageUrl);
    currentImageIndex = 0;
    selectedFolderId = 'all';
    updateUI();
    saveData();
  } catch (error) {
    console.error('Generation error:', error);
  } finally {
    generateBtn.disabled = false;
  }
}

// Folder Management
function showFolderModal() {
  document.getElementById('folderModal').style.display = 'flex';
  document.getElementById('folderName').focus();
}

function hideFolderModal() {
  document.getElementById('folderModal').style.display = 'none';
}

function createFolder() {
  const name = document.getElementById('folderName').value.trim();
  if (name) {
    folders.push({
      id: `folder-${Date.now()}`,
      name,
      images: [],
      isDefault: false,
    });
    hideFolderModal();
    updateUI();
    saveData();
  }
}

function showDeleteModal(folderId) {
  folderToDelete = folderId;
  document.getElementById('deleteModal').style.display = 'flex';
}

function hideDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  folderToDelete = null;
}

function confirmFolderDeletion() {
  if (folderToDelete) {
    const index = folders.findIndex((f) => f.id === folderToDelete);
    if (index > -1) {
      const deletedFolder = folders[index];
      history.push(...deletedFolder.images);
      if (selectedFolderId === folderToDelete) selectedFolderId = 'all';
      folders.splice(index, 1);
      updateUI();
      saveData();
    }
  }
  hideDeleteModal();
}

function showRenameModal(folderId, currentName) {
  renamingFolderId = folderId;
  document.getElementById('renameFolderName').value = currentName;
  document.getElementById('renameModal').style.display = 'flex';
  document.getElementById('renameFolderName').focus();
}

function hideRenameModal() {
  document.getElementById('renameModal').style.display = 'none';
  renamingFolderId = null;
}

function confirmRename() {
  const newName = document.getElementById('renameFolderName').value.trim();
  if (newName && renamingFolderId) {
    const folder = folders.find((f) => f.id === renamingFolderId);
    if (folder) {
      folder.name = newName;
      saveData();
      updateUI();
    }
  }
  hideRenameModal();
}

// Image Management
function selectFolder(folderId) {
  selectedFolderId = folderId === selectedFolderId ? 'all' : folderId;
  currentImageIndex = -1;
  updateUI();
}

function showFromHistory(url) {
  let displayImages =
    selectedFolderId === 'all'
      ? history
      : folders.find((f) => f.id === selectedFolderId)?.images || [];

  currentImageIndex = displayImages.indexOf(url);
  updateUI();
}

function copyLink() {
  let displayImages =
    selectedFolderId === 'all'
      ? history
      : folders.find((f) => f.id === selectedFolderId)?.images || [];

  if (currentImageIndex >= 0 && displayImages[currentImageIndex]) {
    navigator.clipboard.writeText(displayImages[currentImageIndex]);
    const shareBtn = document.querySelector('.share-button');
    shareBtn.textContent = 'Copied!';
    setTimeout(() => (shareBtn.textContent = 'Share Image'), 2000);
  }
}

// Drag & Drop
function handleDragStart(e, url) {
  if (isSelectionMode) return;
  draggedImage = url;
  e.target.classList.add('dragging');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  const folderItem = e.target.closest('.folder-item');
  if (folderItem) folderItem.classList.add('drop-target');
}

function handleDragLeave(e) {
  const folderItem = e.target.closest('.folder-item');
  if (folderItem) folderItem.classList.remove('drop-target');
}

function handleDrop(e, folderId) {
  e.preventDefault();
  const folder = folders.find((f) => f.id === folderId);
  if (!folder || !draggedImage) return;

  if (folderId === 'all') {
    folders.forEach((f) => {
      const index = f.images.indexOf(draggedImage);
      if (index > -1) {
        f.images.splice(index, 1);
        if (!history.includes(draggedImage)) history.push(draggedImage);
      }
    });
  } else {
    const historyIndex = history.indexOf(draggedImage);
    if (historyIndex > -1) history.splice(historyIndex, 1);

    folders.forEach((f) => {
      const folderIndex = f.images.indexOf(draggedImage);
      if (folderIndex > -1) f.images.splice(folderIndex, 1);
    });

    if (!folder.images.includes(draggedImage)) {
      folder.images.push(draggedImage);
    }
  }

  saveData();
  updateUI();
  document.querySelectorAll('.folder-item').forEach((item) => {
    item.classList.remove('drop-target');
  });
}

// Batch Operations
function toggleSelectionMode() {
  isSelectionMode = !isSelectionMode;
  selectedImages.clear();
  document.body.classList.toggle('selection-mode', isSelectionMode);
  document.getElementById('batchToolbar').style.display = isSelectionMode
    ? 'flex'
    : 'none';
  updateUI();
}

function toggleImageSelection(url) {
  if (!isSelectionMode) return;
  selectedImages.has(url)
    ? selectedImages.delete(url)
    : selectedImages.add(url);
  updateUI();
}

function deleteSelected() {
  history = history.filter((url) => !selectedImages.has(url));
  folders.forEach((folder) => {
    folder.images = folder.images.filter((url) => !selectedImages.has(url));
  });
  clearSelection();
  saveData();
  updateUI();
}

function showMoveModal() {
  if (selectedImages.size === 0) return;
  const foldersListModal = document.getElementById('foldersListModal');
  foldersListModal.innerHTML = folders
    .map(
      (folder) => `
        <div class="folder-item move-folder" onclick="moveToFolder('${folder.id}')">
            <div class="folder-content">
                <span>${folder.name}</span>
                <span class="folder-count">
                    ${folder.id === 'all' ? history.length : folder.images.length}
                </span>
            </div>
        </div>
    `
    )
    .join('');
  document.getElementById('moveModal').style.display = 'flex';
}

function hideMoveModal() {
  document.getElementById('moveModal').style.display = 'none';
}

function moveToFolder(folderId) {
  const targetFolder = folders.find((f) => f.id === folderId);
  if (!targetFolder) return;

  selectedImages.forEach((url) => {
    folders.forEach((folder) => {
      if (folder.id !== folderId) {
        if (folder.id === 'all') {
          if (folderId !== 'all') {
            const index = history.indexOf(url);
            if (index > -1) history.splice(index, 1);
          }
        } else {
          const index = folder.images.indexOf(url);
          if (index > -1) folder.images.splice(index, 1);
        }
      }
    });

    if (folderId === 'all') {
      if (!history.includes(url)) {
        history.push(url);
      }
    } else {
      if (!targetFolder.images.includes(url)) {
        targetFolder.images.push(url);
      }
    }
  });

  hideMoveModal();
  clearSelection();
  saveData();
  updateUI();
}

function clearSelection() {
  selectedImages.clear();
  toggleSelectionMode();
}

// Image Deletion
function showDeleteImageModal() {
  closeMenu();
  document.getElementById('deleteImageModal').style.display = 'flex';
}

function hideDeleteImageModal() {
  document.getElementById('deleteImageModal').style.display = 'none';
}

function confirmDeleteImage() {
  let displayImages =
    selectedFolderId === 'all'
      ? history
      : folders.find((f) => f.id === selectedFolderId)?.images || [];

  if (currentImageIndex >= 0 && displayImages[currentImageIndex]) {
    const deletedImage = displayImages.splice(currentImageIndex, 1)[0];
    folders.forEach((folder) => {
      const index = folder.images.indexOf(deletedImage);
      if (index > -1) folder.images.splice(index, 1);
    });
    currentImageIndex = -1;
    updateUI();
    saveData();
  }
  hideDeleteImageModal();
}

function showDeleteAllImagesModal() {
  closeMenu();
  document.getElementById('deleteAllImagesModal').style.display = 'flex';
}

function hideDeleteAllImagesModal() {
  document.getElementById('deleteAllImagesModal').style.display = 'none';
}

function confirmDeleteAllImages() {
  history = [];
  folders.forEach((folder) => (folder.images = []));
  currentImageIndex = -1;
  updateUI();
  saveData();
  hideDeleteAllImagesModal();
}

// Menu Controls
function toggleMenu() {
  const menu = document.getElementById('menuOptions');
  menuOpen = !menuOpen;
  menu.style.display = menuOpen ? 'block' : 'none';
}

function closeMenu() {
  menuOpen = false;
  document.getElementById('menuOptions').style.display = 'none';
}

// Event Listeners
document.addEventListener('click', (e) => {
  if (!e.target.closest('.kebab-menu') && !e.target.closest('.menu-options')) {
    closeMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') clearSelection();
  if (e.ctrlKey && e.key === 'a' && isSelectionMode) {
    e.preventDefault();
    const currentImages =
      selectedFolderId === 'all'
        ? history
        : folders.find((f) => f.id === selectedFolderId).images;
    currentImages.forEach((url) => selectedImages.add(url));
    updateUI();
  }
});

// UI Updates
function updateUI() {
  // Update main image
  const mainImage = document.getElementById('mainImage');
  let displayImages =
    selectedFolderId === 'all'
      ? history
      : folders.find((f) => f.id === selectedFolderId)?.images || [];

  if (currentImageIndex >= 0 && currentImageIndex < displayImages.length) {
    mainImage.src = `${displayImages[currentImageIndex]}?t=${Date.now()}`;
  } else if (displayImages.length > 0) {
    currentImageIndex = 0;
    mainImage.src = `${displayImages[0]}?t=${Date.now()}`;
  } else {
    mainImage.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4=';
  }

  // Update history grid
  const historyGrid = document.getElementById('historyGrid');
  historyGrid.innerHTML = displayImages
    .map(
      (url, index) => `
        <div style="position: relative">
            <input type="checkbox" class="selection-checkbox" 
                ${selectedImages.has(url) ? 'checked' : ''}
                onchange="toggleImageSelection('${url}')"
                style="${isSelectionMode ? 'display: block' : 'display: none'}">
            <img src="${url}" 
                class="history-image ${selectedImages.has(url) ? 'selected' : ''} 
                    ${index === currentImageIndex ? 'active' : ''}"
                onclick="${
                  isSelectionMode
                    ? `toggleImageSelection('${url}')`
                    : `showFromHistory('${url}')`
                }"
                draggable="${!isSelectionMode}"
                ondragstart="handleDragStart(event, '${url}')"
                ondragend="handleDragEnd(event)"
                alt="History image">
        </div>
    `
    )
    .join('');

  // Update folders list
  const foldersList = document.getElementById('foldersList');
  foldersList.innerHTML = folders
    .map((folder) => {
      const count = folder.id === 'all' ? history.length : folder.images.length;

      return `
            <li class="folder-item ${
              selectedFolderId === folder.id ? 'selected' : ''
            }"
                ondragover="handleDragOver(event)"
                ondragleave="handleDragLeave(event)"
                ondrop="handleDrop(event, '${folder.id}')">
                <div class="folder-actions">
                    ${
                      !folder.isDefault
                        ? `
                    <button class="rename-folder-btn" 
                        onclick="event.stopPropagation(); showRenameModal('${
                          folder.id
                        }', '${folder.name.replace(/'/g, "\\'")}')"
                        aria-label="Rename folder">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                        </svg>
                    </button>
                    <button class="delete-folder-btn" 
                        onclick="event.stopPropagation(); showDeleteModal('${folder.id}')"
                        aria-label="Delete folder">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                    `
                        : '<div style="width: 46px"></div>'
                    }
                </div>
                <div class="folder-content" onclick="selectFolder('${folder.id}')">
                    <span style="overflow: hidden; text-overflow: ellipsis">${
                      folder.name
                    }</span>
                    <span class="folder-count">${count}</span>
                </div>
            </li>
        `;
    })
    .join('');

  // Update selection count
  document.getElementById(
    'selectionCount'
  ).textContent = `${selectedImages.size} Selected`;
}
