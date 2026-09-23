"use strict";

const STORAGE_KEY = "publicPixelCanvasState";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const sampleButton = document.getElementById("sampleButton");
const tooltip = document.getElementById("tooltip");
const toast = document.getElementById("toast");
const status = document.getElementById("status");

const settingsBackdrop = document.getElementById("settingsBackdrop");
const settingsWidth = document.getElementById("settingsWidth");
const settingsAutoWidth = document.getElementById("settingsAutoWidth");
const settingsHeight = document.getElementById("settingsHeight");
const settingsAutoHeight = document.getElementById("settingsAutoHeight");
const settingsCooldown = document.getElementById("settingsCooldown");
const settingsPassword = document.getElementById("settingsPassword");

let state = loadState();
let sampleMode = false;
let nextChangeAllowedAt = 0;
let toastTimer = null;

function defaultState() {
    const width = 64;
    const height = 32;

    return {
        version: 1,
        settings: {
            width,
            height,
            cooldownSeconds: 5,
            password: "admin"
        },
        pixels: createPixels(width, height)
    };
}

function createPixels(width, height, oldPixels = null) {
    const pixels = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const oldPixel = oldPixels?.[y]?.[x];

            pixels.push(oldPixel || {
                color: "#ffffff",
                count: 0,
                lastChanged: null
            });
        }
    }

    return pixels;
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return defaultState();
        }

        const parsed = JSON.parse(saved);
        const width = Number(parsed.settings?.width) || 64;
        const height = Number(parsed.settings?.height) || 32;

        const oldPixels = [];

        for (let y = 0; y < height; y++) {
            oldPixels[y] = [];

            for (let x = 0; x < width; x++) {
                oldPixels[y][x] = parsed.pixels?.[y * width + x] || null;
            }
        }

        return {
            version: 1,
            settings: {
                width,
                height,
                cooldownSeconds:
                    Number(parsed.settings?.cooldownSeconds) || 5,
                password: String(parsed.settings?.password || "admin")
            },
            pixels: createPixels(width, height, oldPixels)
        };
    } catch (error) {
        console.error("Could not load saved canvas:", error);
        return defaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pixelIndex(x, y) {
    return y * state.settings.width + x;
}

function getPixel(x, y) {
    return state.pixels[pixelIndex(x, y)];
}

/*
  The canvas always matches the current browser viewport.
  Each logical pixel gets a proportional width and height.
*/
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawCanvas();
}

function drawCanvas() {
    const width = state.settings.width;
    const height = state.settings.height;

    const cellWidth = window.innerWidth / width;
    const cellHeight = window.innerHeight / height;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = getPixel(x, y);

            ctx.fillStyle = pixel.color;
            ctx.fillRect(
                x * cellWidth,
                y * cellHeight,
                cellWidth + 0.5,
                cellHeight + 0.5
            );
        }
    }

    // Grid lines
    if (cellWidth >= 5 && cellHeight >= 5) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x++) {
            const px = x * cellWidth + 0.5;

            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, window.innerHeight);
            ctx.stroke();
        }

        for (let y = 0; y <= height; y++) {
            const py = y * cellHeight + 0.5;

            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(window.innerWidth, py);
            ctx.stroke();
        }
    }

    updateStatus();
}

function getCanvasPixel(event) {
    const width = state.settings.width;
    const height = state.settings.height;

    const cellWidth = window.innerWidth / width;
    const cellHeight = window.innerHeight / height;

    const x = Math.floor(event.clientX / cellWidth);
    const y = Math.floor(event.clientY / cellHeight);

    if (x < 0 || y < 0 || x >= width || y >= height) {
        return null;
    }

    return { x, y };
}

function updateStatus() {
    const remaining = nextChangeAllowedAt - Date.now();

    if (remaining > 0) {
        status.textContent =
            `Cooldown: ${(remaining / 1000).toFixed(1)} seconds`;
    } else {
        status.textContent = "Ready";
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2600);
}

function showPixelTooltip(event, x, y) {
    const pixel = getPixel(x, y);

    const lastChanged = pixel.lastChanged
        ? new Date(pixel.lastChanged).toLocaleString()
        : "Never";

    tooltip.innerHTML = `
  <strong>Pixel ${x}, ${y}</strong><br>
  Color:
  <span
    class="color-preview"
    aria-label="Color preview: ${pixel.color}"
  ></span>
  ${pixel.color}<br>
  Changed: ${pixel.count} time${pixel.count === 1 ? "" : "s"}<br>
  Last changed: ${lastChanged}
`;

    tooltip.querySelector(".color-preview").style.backgroundColor = pixel.color;


    tooltip.style.display = "block";

    const padding = 12;
    let left = event.clientX + padding;
    let top = event.clientY + padding;

    const rect = tooltip.getBoundingClientRect();

    if (left + rect.width > window.innerWidth - 8) {
        left = event.clientX - rect.width - padding;
    }

    if (top + rect.height > window.innerHeight - 8) {
        top = event.clientY - rect.height - padding;
    }

    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
}

function hideTooltip() {
    tooltip.style.display = "none";
}

function setSampleMode(enabled) {
    sampleMode = enabled;
    sampleButton.classList.toggle("active", enabled);
    canvas.style.cursor = enabled ? "copy" : "crosshair";
}

canvas.addEventListener("mousemove", event => {
    const position = getCanvasPixel(event);

    if (!position) {
        hideTooltip();
        return;
    }

    showPixelTooltip(event, position.x, position.y);
});

canvas.addEventListener("mouseleave", hideTooltip);

canvas.addEventListener("click", event => {
    const position = getCanvasPixel(event);

    if (!position) {
        return;
    }

    const pixel = getPixel(position.x, position.y);

    if (sampleMode) {
        colorPicker.value = pixel.color;
        setSampleMode(false);
        showToast(`Sampled ${pixel.color}`);
        return;
    }

    const now = Date.now();

    if (now < nextChangeAllowedAt) {
        const seconds = ((nextChangeAllowedAt - now) / 1000).toFixed(1);
        showToast(`Please wait ${seconds} seconds.`);
        return;
    }

    pixel.color = colorPicker.value.toLowerCase();
    pixel.count += 1;
    pixel.lastChanged = new Date().toISOString();

    nextChangeAllowedAt =
        now + state.settings.cooldownSeconds * 1000;

    saveState();
    drawCanvas();
    updateStatus();

    showToast(`Pixel changed to ${pixel.color}`);
});

sampleButton.addEventListener("click", () => {
    setSampleMode(!sampleMode);

    if (sampleMode) {
        showToast("Click a pixel to sample its color.");
    }
});

document
    .getElementById("settingsButton")
    .addEventListener("click", () => {
        const enteredPassword = prompt("Enter the settings password:");

        if (enteredPassword === null) {
            return;
        }

        if (enteredPassword !== state.settings.password) {
            alert("Incorrect password.");
            return;
        }

        settingsWidth.value = state.settings.width;
        settingsHeight.value = state.settings.height;
        settingsCooldown.value = state.settings.cooldownSeconds;
        settingsPassword.value = state.settings.password;

        settingsBackdrop.classList.add("visible");
    });

document
    .getElementById("cancelSettingsButton")
    .addEventListener("click", () => {
        settingsBackdrop.classList.remove("visible");
    });

settingsBackdrop.addEventListener("click", event => {
    if (event.target === settingsBackdrop) {
        settingsBackdrop.classList.remove("visible");
    }
});

document
    .getElementById("settingsAutoWidth")
    .addEventListener("click", () => {
        const height = Number(settingsHeight.value);
        const width = Math.min(Math.round(height * window.innerWidth / window.innerHeight), 500);
        settingsWidth.value = width;
    });

document
    .getElementById("settingsAutoHeight")
    .addEventListener("click", () => {
        const width = Number(settingsWidth.value);
        const height = Math.min(Math.round(width * window.innerHeight / window.innerWidth), 500);
        settingsHeight.value = height;
    });

document
    .getElementById("saveSettingsButton")
    .addEventListener("click", () => {
        const width = Number(settingsWidth.value);
        const height = Number(settingsHeight.value);
        const cooldownSeconds = Number(settingsCooldown.value);
        const password = settingsPassword.value.trim();

        if (
            !Number.isInteger(width) ||
            width < 1 ||
            width > 500 ||
            !Number.isInteger(height) ||
            height < 1 ||
            height > 500
        ) {
            alert("Canvas width and height must be whole numbers from 1 to 500.");
            return;
        }

        if (
            !Number.isFinite(cooldownSeconds) ||
            cooldownSeconds < 0 ||
            cooldownSeconds > 86400
        ) {
            alert("Cooldown must be between 0 and 86400 seconds.");
            return;
        }

        if (!password) {
            alert("The settings password cannot be empty.");
            return;
        }

        const oldWidth = state.settings.width;
        const oldHeight = state.settings.height;
        const oldPixels = [];

        for (let y = 0; y < oldHeight; y++) {
            oldPixels[y] = [];

            for (let x = 0; x < oldWidth; x++) {
                oldPixels[y][x] = state.pixels[y * oldWidth + x];
            }
        }

        state.settings = {
            width,
            height,
            cooldownSeconds,
            password
        };

        state.pixels = createPixels(width, height, oldPixels);

        saveState();
        resizeCanvas();

        settingsBackdrop.classList.remove("visible");
        showToast("Settings saved.");
    });

document
    .getElementById("exportButton")
    .addEventListener("click", () => {
        const exportData = {
            ...state,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob(
            [JSON.stringify(exportData, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "pixel-canvas-export.json";
        link.click();

        URL.revokeObjectURL(url);
    });

document
    .getElementById("importButton")
    .addEventListener("click", () => {
        document.getElementById("importFile").click();
    });

document
    .getElementById("importFile")
    .addEventListener("change", event => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);

                const width = Number(imported.settings?.width);
                const height = Number(imported.settings?.height);

                if (
                    !Number.isInteger(width) ||
                    !Number.isInteger(height) ||
                    width < 1 ||
                    height < 1 ||
                    !Array.isArray(imported.pixels) ||
                    imported.pixels.length !== width * height
                ) {
                    throw new Error("Invalid canvas file.");
                }

                state = {
                    version: 1,
                    settings: {
                        width,
                        height,
                        cooldownSeconds:
                            Number(imported.settings.cooldownSeconds) || 5,
                        password: String(imported.settings.password || "admin")
                    },
                    pixels: imported.pixels.map(pixel => ({
                        color: typeof pixel.color === "string"
                            ? pixel.color
                            : "#ffffff",
                        count: Number(pixel.count) || 0,
                        lastChanged: pixel.lastChanged || null
                    }))
                };

                saveState();
                resizeCanvas();

                settingsWidth.value = state.settings.width;
                settingsHeight.value = state.settings.height;
                settingsCooldown.value = state.settings.cooldownSeconds;
                settingsPassword.value = state.settings.password;

                showToast("Canvas imported successfully.");
            } catch (error) {
                alert(`Import failed: ${error.message}`);
            }

            event.target.value = "";
        };

        reader.readAsText(file);
    });

window.addEventListener("resize", resizeCanvas);

setInterval(updateStatus, 100);

resizeCanvas();
updateStatus();