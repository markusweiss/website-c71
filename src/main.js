import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue } from "./dialogue";

k.loadSprite("nerd", "./nerd.png", {
  sliceX: 36,
  anims: {
    stay: { from: 12, to: 27, loop: true },
    run: { from: 0, to: 11 },
    down: { from: 28, to: 31 },
    up: { from: 32, to: 35 },
  },
});

let soundBG = new Audio("./lofi.mp3");
let walkSound = new Audio("./step.mp3"); // Schrittgeräusch
walkSound.loop = true;
walkSound.volume = 0.4;

k.loadSprite("map", "./office.png");
k.loadSprite("bg", "./background.png");

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
      isInDialogue: false,
    },
    "player",
  ]);

  player.play("stay", { speed: 2 });

  // Walksound-Status merken
  let isWalkingSoundPlaying = false;

  // KeyRelease: Animation zurücksetzen & Walksound stoppen, falls nötig
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

    // Walksound stoppen, wenn keine Bewegungstaste gedrückt ODER Dialog aktiv
    if (
      (!isAnyMovementKeyDown || player.isInDialogue) &&
      isWalkingSoundPlaying
    ) {
      walkSound.pause();
      walkSound.currentTime = 0;
      isWalkingSoundPlaying = false;
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
                if (soundBG.paused) {
                  soundBG.loop = true;
                  soundBG.volume = 0.2;
                  soundBG.play();
                } else {
                  soundBG.pause();
                  soundBG.currentTime = 0;
                }
              }

              // Walksound beim Dialog sofort stoppen
              if (isWalkingSoundPlaying) {
                walkSound.pause();
                walkSound.currentTime = 0;
                isWalkingSoundPlaying = false;
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

  k.onUpdate(() => {
    const isStationary = player.pos.dist(lastPos) < 1;

    if (isStationary && player.curAnim() !== "stay" && !player.isInDialogue) {
      player.play("stay", { speed: 2 });
    }

    // Walksound stoppen, wenn wir stehen geblieben sind oder ein Dialog aktiv ist
    if ((isStationary || player.isInDialogue) && isWalkingSoundPlaying) {
      walkSound.pause();
      walkSound.currentTime = 0;
      isWalkingSoundPlaying = false;
    }

    lastPos = player.pos.clone();
    k.camPos(player.worldPos().x, player.worldPos().y);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    // Walksound starten bei Mausbewegung (nur wenn kein Dialog)
    if (!player.isInDialogue && !isWalkingSoundPlaying) {
      walkSound.play();
      isWalkingSoundPlaying = true;
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

  // Bewegung über Keyboard + Walksound starten (nur für Bewegungs-Tasten)
  k.onKeyDown((key) => {
    if (player.isInDialogue) return;

    const movementKeys = ["right", "left", "up", "down", "d", "a", "w", "s"];
    // Wenn die gedrückte Taste keine Bewegungs-Taste ist: nichts tun (kein Walksound)
    if (!movementKeys.includes(key)) return;

    // aktuelle Bewegungstasten prüfen (wie vorher)
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

    const nbOfKeyPressed = keyMap.filter(Boolean).length;
    if (nbOfKeyPressed > 1) return;

    // Walksound starten
    if (!isWalkingSoundPlaying) {
      walkSound.play();
      isWalkingSoundPlaying = true;
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
