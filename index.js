"use strict";
class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static zero() {
        return new Vector2(0, 0);
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    norm() {
        const l = this.length();
        if (l === 0)
            return Vector2.zero();
        return new Vector2(this.x / l, this.y / l);
    }
    sub(that) {
        return new Vector2(this.x - that.x, this.y - that.y);
    }
    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y);
    }
    div(that) {
        return new Vector2(this.x / that.x, this.y / that.y);
    }
    mul(that) {
        return new Vector2(this.x * that.x, this.y * that.y);
    }
    scale(value) {
        return new Vector2(this.x * value, this.y * value);
    }
    distanceTo(that) {
        return that.sub(this).length();
    }
    array() {
        return [this.x, this.y];
    }
}
const EPS = 1e-3;
function canvasSize(ctx) {
    return new Vector2(ctx.canvas.width, ctx.canvas.height);
}
function fillCircle(ctx, center, radius) {
    ctx.beginPath();
    ctx.arc(...center.array(), radius, 0, 2 * Math.PI);
    ctx.fill();
}
function strokeLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(...p1.array());
    ctx.lineTo(...p2.array());
    ctx.stroke();
}
function snap(x, dx) {
    if (dx > 0)
        return Math.ceil(x + EPS);
    if (dx < 0)
        return Math.floor(x - EPS);
    return x;
}
function hittingCell(p1, p2) {
    const d = p2.sub(p1);
    return new Vector2(Math.floor(p2.x + Math.sign(d.x) * EPS), Math.floor(p2.y + Math.sign(d.y) * EPS));
}
function rayStep(p1, p2) {
    /**
     * p1 = (x1, y1)
     * p2 = (x2, y2)
     *
     * y1 = k * x1 + c
     * y2 = k * x2 + c
     *
     * c = y1 - k * x1
     *
     * y2 = k * x2 + y1 - k * x1
     * y2 = k*(x2 - x1) + y1
     * y2 - y1 = k*(x2-x1)
     * k = (y2 - y1) / (x2 - x1)
     *
     * dy = y2 - y1
     * dx = x2 - x1
     * k = dy / dx
     */
    const d = p2.sub(p1);
    let p3 = p2;
    if (d.x !== 0) {
        const k = d.y / d.x;
        const c = p1.y - k * p1.x;
        {
            const x3 = snap(p2.x, d.x);
            const y3 = x3 * k + c;
            p3 = new Vector2(x3, y3);
        }
        if (k !== 0) {
            const y3 = snap(p2.y, d.y);
            const x3 = (y3 - c) / k;
            const p3t = new Vector2(x3, y3);
            if (p2.distanceTo(p3t) < p2.distanceTo(p3)) {
                p3 = p3t;
            }
        }
    }
    else {
        const y3 = snap(p2.y, d.y);
        const x3 = p2.x;
        p3 = new Vector2(x3, y3);
    }
    return p3;
}
function sceneSize(scene) {
    const y = scene.length;
    let x = Number.MIN_VALUE;
    for (let row of scene) {
        x = Math.max(x, row.length);
    }
    return new Vector2(x, y);
}
function minimap(ctx, p1, p2, position, size, scene) {
    ctx.reset();
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const gridSize = sceneSize(scene);
    ctx.translate(...position.array());
    ctx.scale(...size.div(gridSize).array());
    ctx.lineWidth = 0.1;
    for (let y = 0; y < gridSize.y; ++y) {
        for (let x = 0; x < gridSize.x; ++x) {
            if (scene[y][x] !== 0) {
                ctx.fillStyle = "#303030";
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    ctx.strokeStyle = "#303030";
    for (let x = 0; x <= gridSize.x; ++x) {
        strokeLine(ctx, new Vector2(x, 0), new Vector2(x, gridSize.y));
    }
    for (let y = 0; y <= gridSize.y; ++y) {
        strokeLine(ctx, new Vector2(0, y), new Vector2(gridSize.x, y));
    }
    ctx.fillStyle = "magenta";
    fillCircle(ctx, p1, 0.2);
    if (p2 !== undefined) {
        ctx.fillStyle = "red";
        for (;;) {
            fillCircle(ctx, p2, 0.1);
            ctx.strokeStyle = "red";
            strokeLine(ctx, p1, p2);
            const c = hittingCell(p1, p2);
            if (c.x < 0 || c.x >= gridSize.x
                ||
                    c.y < 0 || c.y >= gridSize.y
                ||
                    scene[c.y][c.x] === 1)
                break;
            const p3 = rayStep(p1, p2);
            p1 = p2;
            p2 = p3;
        }
    }
}
(() => {
    const scene = [
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const game = document.getElementById("game");
    if (game === null) {
        throw new Error("No canvas with id 'game' is found");
    }
    const factor = 80;
    game.width = 16 * factor;
    game.height = 9 * factor;
    const p1 = sceneSize(scene).mul(new Vector2(0.93, 0.93));
    const ctx = game.getContext("2d");
    if (ctx === null) {
        throw new Error("2D context is not supported");
    }
    let p2 = undefined;
    const minimapPosition = Vector2.zero().add(canvasSize(ctx).scale(0.03));
    const cellSize = ctx.canvas.width * 0.02;
    const minimapSize = sceneSize(scene).scale(cellSize);
    game.addEventListener("mousemove", (event) => {
        p2 = new Vector2(event.offsetX, event.offsetY)
            .sub(minimapPosition)
            .div(minimapSize)
            .mul(sceneSize(scene));
        minimap(ctx, p1, p2, minimapPosition, minimapSize, scene);
    });
    minimap(ctx, p1, p2, minimapPosition, minimapSize, scene);
})();
