import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue } from "./dialogue";
import "./styles.css";

// Sprites laden
k.loadSprite("nerd", "./nerd.png", {
  sliceX: 36,
  anims: {
    stay: { from: 12, to: 27, loop: true },
    run: { from: 0, to: 11 },
    down: { from: 28, to: 31 },
    up: { from: 32, to: 35 },
  },
});

k.loadSprite("map", "./office.png");
k.loadSprite("bg", "./background.png");

// Sounds laden
await k.loadSound("walk", "./step.mp3");
await k.loadSound("bg", "./lofi.mp3");

k.scene("main", async () => {
  const tilesX = Math.ceil(k.width() / 256);
  const tilesY = Math.ceil(k.height() / 256);

  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      k.add([k.sprite("bg"), k.pos(x * 256, y * 256), k.fixed()]);
    }
  }

  const map = k.add([k.sprite("map"), k.pos(0, 0), k.scale(scaleFactor)]);

  const player = k.make([
    k.sprite("nerd"),
    k.area({ shape: new k.Rect(k.vec2(0, 3), 10, 10), speed: 2 }),
    k.body(),
    k.pos(k.width() / 2, k.height() / 2),
    k.scale(2.5),
    {
      speed: 300,
      direction: "run",
      isInDialogue: true,
    },
    "player",
  ]);

  player.play("stay", { speed: 2 });

  displayDialogue(
    [
      "Here, you can explore freely, interact with objects, and discover 🔎 little surprises around every corner. ",
      "Enjoy ❤️ your stay and have fun exploring!",
    ],
    () => {
      player.isInDialogue = false;
    }
  );

  // --- Sound-Referenzen ---
  let walkSoundRef = null;
  let bgSoundRef = null;

  // --- KeyRelease: Animation zurücksetzen + Walksound stoppen ---
  k.onKeyRelease(() => {
    const isAnyMovementKeyDown =
      k.isKeyDown("right") ||
      k.isKeyDown("left") ||
      k.isKeyDown("up") ||
      k.isKeyDown("down") ||
      k.isKeyDown("w") ||
      k.isKeyDown("a") ||
      k.isKeyDown("s") ||
      k.isKeyDown("d");

    if (
      !isAnyMovementKeyDown &&
      !player.isInDialogue &&
      player.curAnim() !== "stay"
    ) {
      player.play("stay", { speed: 2 });
    }

    if ((!isAnyMovementKeyDown || player.isInDialogue) && walkSoundRef) {
      walkSoundRef.stop();
      walkSoundRef = null;
    }
  });

  try {
    const response = await fetch("./office.json");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const mapData = await response.json();
    const layers = mapData.layers;

    for (const layer of layers) {
      if (layer.name === "walls") {
        for (const wall of layer.objects) {
          map.add([
            k.area({ shape: new k.Rect(k.vec2(0), wall.width, wall.height) }),
            k.body({ isStatic: true }),
            k.pos(wall.x, wall.y),
            wall.name,
          ]);
        }
      }
      if (layer.name === "things") {
        for (const things of layer.objects) {
          map.add([
            k.area({
              shape: new k.Rect(k.vec2(0), things.width, things.height),
            }),
            k.body({ isStatic: true }),
            k.pos(things.x, things.y),
            things.name,
          ]);

          if (things.name) {
            player.onCollide(things.name, () => {
              if (things.name === "radio") {
                if (!bgSoundRef) {
                  bgSoundRef = k.play("bg", { loop: true, volume: 0.2 });
                } else {
                  bgSoundRef.stop();
                  bgSoundRef = null;
                }
              }

              if (walkSoundRef) {
                walkSoundRef.stop();
                walkSoundRef = null;
              }

              player.isInDialogue = true;
              player.play("stay", { speed: 2 });
              displayDialogue(dialogueData[things.name], () => {
                player.isInDialogue = false;
              });
            });
          }
        }
      }

      if (layer.name === "spawn") {
        for (const entity of layer.objects) {
          if (entity.name === "spawn") {
            player.pos = k.vec2(
              (map.pos.x + entity.x) * scaleFactor,
              (map.pos.y + entity.y) * scaleFactor
            );
            k.add(player);
          }
        }
      }
    }
  } catch (error) {
    console.error("error loading JSON:", error);
  }

  let lastPos = player.pos.clone();
  const note = document.getElementById("note");
  let noteTimer = null;

  k.onUpdate(() => {
    const isStationary = player.pos.dist(lastPos) < 1;

    if (isStationary && player.curAnim() !== "stay" && !player.isInDialogue) {
      player.play("stay", { speed: 2 });
    }

    if ((isStationary || player.isInDialogue) && walkSoundRef) {
      walkSoundRef.stop();
      walkSoundRef = null;
    }

    if (isStationary && !player.isInDialogue) {
      // Nur starten, wenn noch kein Timer läuft
      if (!noteTimer) {
        noteTimer = setTimeout(() => {
          note.classList.add("visible");
          note.classList.remove("hidden");
        }, 3000);
      }
    } else {
      // Spieler bewegt sich → Timer abbrechen & Hinweis verstecken
      if (noteTimer) {
        clearTimeout(noteTimer);
        noteTimer = null;
      }
      note.classList.remove("visible");
      note.classList.add("hidden");
    }

    lastPos = player.pos.clone();
    k.camPos(player.worldPos().x, player.worldPos().y);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());

    if (!walkSoundRef) {
      walkSoundRef = k.play("walk", { loop: true, volume: 0.4 });
    }

    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);
    const lowerBound = 80;
    const upperBound = 100;

    if (mouseAngle > lowerBound && mouseAngle < upperBound) {
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "up";
      return;
    }
    if (mouseAngle < -lowerBound && mouseAngle > -upperBound) {
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "down";
      return;
    }
    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "right";
      return;
    }
    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "left";
      return;
    }
  });

  // --- KeyDown Bewegung + Walksound ---
  k.onKeyDown((key) => {
    if (player.isInDialogue) return;

    const movementKeys = ["right", "left", "up", "down", "d", "a", "w", "s"];
    if (!movementKeys.includes(key)) return;

    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
      k.isKeyDown("d"),
      k.isKeyDown("a"),
      k.isKeyDown("w"),
      k.isKeyDown("s"),
    ];

    if (keyMap.filter(Boolean).length > 1) return;

    if (!walkSoundRef) {
      walkSoundRef = k.play("walk", { loop: true, volume: 0.4 });
    }

    if (keyMap[0] || keyMap[4]) {
      player.flipX = false;
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }
    if (keyMap[1] || keyMap[5]) {
      player.flipX = true;
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }
    if (keyMap[2] || keyMap[6]) {
      if (player.curAnim() !== "up") player.play("up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }
    if (keyMap[3] || keyMap[7]) {
      if (player.curAnim() !== "down") player.play("down");
      player.direction = "down";
      player.move(0, player.speed);
      return;
    }
  });
});

k.setBackground(k.Color.fromHex("#37966E"));
k.go("main");
