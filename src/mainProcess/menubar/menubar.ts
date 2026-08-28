import { nativeImage } from "electron";
import Logger from "electron-log";
import { menubar as baseMenubar, Menubar } from "menubar";
import path from "path";

const TEMPLATE_IMAGE = "whiteArmChair.png";
function getTemplateIcon() {
  const image = nativeImage.createFromPath(
    path.join(__dirname, "images", TEMPLATE_IMAGE),
  );
  image.setTemplateImage(true);
  return image;
}

let mb: Menubar | null = null;

export const createMenubar = () => {
  mb = baseMenubar({
    icon: getTemplateIcon(),
    index: MAIN_WINDOW_VITE_DEV_SERVER_URL
      ? `${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/menubar`
      : `file://${path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)}#/menubar`,
    showDockIcon: false,
    browserWindow: {
      width: 480,
      height: 640,
      resizable: false,
      transparent: true,
      // backgroundColor: "#00000000",
      vibrancy: "hud",
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  });

  mb.on("ready", () => {
    // Set the template icon on ready
    mb?.tray.setImage(getTemplateIcon());
    Logger.info("Menubar app is ready.");
  });

  mb.on("show", () => {
    if (process.env.IS_DEV) {
      mb?.window?.webContents.openDevTools({ mode: "detach" });
    }
  });

  return mb;
};
