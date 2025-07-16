import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
// import { displayDialogue, setCamScale } from "./utils";

k.loadSprite("nerd", "./nerd.png", {
  sliceX: 3,
  anims: {
    stay: {
      from: 0,
      to: 0,
    },
    run: {
      from: 0,
      to: 2,
    },
  },
});

k.scene("main", async () => {
  console.log(k.scale(scaleFactor));
});

k.loadSprite("map", "./office.png");

k.scene("main", async () => {
  const map = k.add([k.sprite("map"), k.pos(0, 0), k.scale(scaleFactor)]);

  console.log("Map loaded:", map);

  const player = k.make([
    k.sprite("nerd", { anim: "stay" }),
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),
    }),
    k.body(),
    //k.anchor("center"),
    k.pos(k.width() / 2, k.height() / 2),
    k.scale(0.5),
    {
      speed: 250,
      direction: "run",
      isInDialogue: false,
    },
    "player",
  ]);

  //const mapData = await (await fetch("./office.json")).json();
  //const layers = mapData.layers;

  try {
    const response = await fetch("./office.json");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const mapData = await response.json();

    const layers = mapData.layers;
    //console.log("Layers loaded:", layers);
    console.log(mapData);

    for (const layer of layers) {
      if (layer.name === "walls") {
        for (const wall of layer.objects) {
          map.add([
            k.area({
              shape: new k.Rect(k.vec2(0), wall.width, wall.height),
            }),
            k.body({ isStatic: true }),
            k.pos(wall.x, wall.y),
            wall.name,
          ]);
        }
      }
      if (layer.name === "things") {
        for (const things of layer.objects) {
          console.log("Boundary layer:", things.name);
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
              console.log("Text ist:", dialogueData[things.name]);
            });
          }
        }
      }

      /*
        player.onCollide(layer.name, () => {
          console.log("Things layer:", layer.name);
          player.isInDialogue = true;

          displayDialogue(
            dialogueData[layer.name],
            () => (player.isInDialogue = false)
          );
        });
        
      }*/

      if (layer.name === "spawn") {
        for (const entity of layer.objects) {
          if (entity.name === "spawn") {
            player.pos = k.vec2(
              (map.pos.x + entity.x) * scaleFactor,
              (map.pos.y + entity.y) * scaleFactor
            );
            k.add(player);
            //continue;
          }
        }
      }
    }
  } catch (error) {
    console.error("error loading JSON:", error);
  }

  /*
  let targetPos = null;

  k.onClick((pos) => {
    targetPos = k.vec2(pos.x, pos.y);

    console.log("Target position set:", targetPos);
  });



  k.onUpdate("player", (p) => {
    if (targetPos) {
      const dir = targetPos.sub(p.pos).unit();
      const dist = p.pos.dist(targetPos);

      if (dist > 4) {
        p.move(dir.scale(p.speed));
        p.play("run");
      } else {
        p.play("stay");
        targetPos = null;
      }
    }
  });
  */

  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    console.log("Mouse angle:", mouseAngle);

    const lowerBound = 80;
    const upperBound = 100;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "run"
    ) {
      player.play("run");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "run"
    ) {
      player.play("run");
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

  // Handle player movement with keyboard input
  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "run") player.play("run");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});

k.setBackground(k.Color.fromHex("#37966E"));

k.go("main");
