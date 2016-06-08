var socket = io.connect("http://76.28.150.193:8888");

function Animation(spriteSheet, frameWidth, frameHeight, sheetWidth, frameDuration, frames, loop, scale) {
	this.spriteSheet = spriteSheet;
	this.frameWidth = frameWidth;
	this.frameDuration = frameDuration;
	this.frameHeight = frameHeight;
	this.sheetWidth = sheetWidth;
	this.frames = frames;
	this.totalTime = frameDuration * frames;
	this.elapsedTime = 0;
	this.loop = loop;
	this.scale = scale;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y) {
	this.elapsedTime += tick;
	if (this.isDone()) {
		if (this.loop) this.elapsedTime = 0;
	}
	var frame = this.currentFrame();
	var xindex = 0;
	var yindex = 0;
	xindex = frame % this.sheetWidth;
	yindex = Math.floor(frame / this.sheetWidth);

	ctx.drawImage(this.spriteSheet,
			xindex * this.frameWidth, yindex * this.frameHeight,  // source from sheet
			this.frameWidth, this.frameHeight,
			x, y,
			this.frameWidth * this.scale,
			this.frameHeight * this.scale);
}

Animation.prototype.currentFrame = function () {
	return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
	return (this.elapsedTime >= this.totalTime);
}

function distance(a, b) {
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
};

function Monster(game, spritesheet, x, y) {
	this.animation = new Animation(spritesheet, 425, 340, 3, 0.19, 3, true, 0.2);
	this.speed = 10;
	this.ctx = game.ctx;
	this.x = x;
	this.y = y;
	this.radius = 60;
	Entity.call(this, game, x, y);
};

Monster.prototype = new Entity();
Monster.prototype.constructor = Monster;

Monster.prototype.collide = function(other) {
	return distance(this, other) < this.radius + other.radius;
};

Monster.prototype.update = function () {
	this.y += this.game.clockTick * this.speed;
	if (this.y > 800) this.y = -230;
	Entity.prototype.update.call(this);
};

Monster.prototype.draw = function () {
	this.animation.drawFrame(this.game.clockTick, this.ctx, this.x, this.y);
	Entity.prototype.draw.call(this);
};

function Turret(game, spritesheet, x, y) {
	this.animation = new Animation(spritesheet, 546, 800, 1, 0.1, 1, true, 0.4);
	this.speed = 0;
	this.ctx = game.ctx;
	this.width = 200;
	this.height = 480;
	this.x = x;
	this.y = y;
	Entity.call(this, game, x, y);
};

Turret.prototype = new Entity();
Turret.prototype.constructor = Turret;

Turret.prototype.update = function () {
	Entity.prototype.update.call(this);

	if (this.game.clockTick > Math.random() * 0.7) {
		for (var i = 0; i < this.game.entities.length; i++) {
			var ent = this.game.entities[i];
			if (ent instanceof Monster && this.game.clockTick > Math.random() * 0.7) {
				var bullet = new Bullet(this.game, AM.getAsset("./img/bullet.png"), 230, 278);
				this.game.addEntity(bullet);
			}
		}
	}

	for (var i = 0; i < this.game.entities.length; i++) {
		var ent = this.game.entities[i];
		if (ent !== this && this.collide(ent)) {
			this.game.entities[i].removeFromWorld = true;
		} 
	}

};

Turret.prototype.collide = function(other) {
	return distance(this, other) < this.width + other.radius;
};

Turret.prototype.draw = function () {
	this.animation.drawFrame(this.game.clockTick, this.ctx, this.x, this.y);
	Entity.prototype.draw.call(this);
};

function Bullet(game, spritesheet, x, y) {
	this.animation = new Animation(spritesheet, 18, 18, 1, 0.19, 1, true, 0.9);
	this.speed = 100;
	this.radius = 9;
	this.visualRadius = 500;
	this.x = x;
	this.y = y;
	this.ctx = game.ctx;
	Entity.call(this, game, x, y);

	this.velocity = { x: Math.random() * 1000, y: Math.random() * 1000 };
	var speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
	if (speed > maxSpeed) {
		var ratio = maxSpeed / speed;
		this.velocity.x *= ratio;
		this.velocity.y *= ratio;
	}
};

Bullet.prototype = new Entity();
Bullet.prototype.constructor = Bullet;

Bullet.prototype.collide = function (other) {
	return distance(this, other) < this.radius + other.radius;
};

Bullet.prototype.collideLeft = function () {
	return (this.x - this.radius) < 0;
};

Bullet.prototype.collideRight = function () {
	return (this.x + this.radius) > 800;
};

Bullet.prototype.collideTop = function () {
	return (this.y - this.radius) < 0;
};

Bullet.prototype.collideBottom = function () {
	return (this.y + this.radius) > 800;
};

Bullet.prototype.update = function () {
	Entity.prototype.update.call(this);	

	this.x += this.velocity.x * this.game.clockTick;
	this.y += this.velocity.y * this.game.clockTick;

	if (this.collideLeft() || this.collideRight()) {
		this.velocity.x = -this.velocity.x * friction;
		if (this.collideLeft()) this.x = this.radius;
		if (this.collideRight()) this.x = 800 - this.radius;
		this.x += this.velocity.x * this.game.clockTick;
		this.y += this.velocity.y * this.game.clockTick;
	}

	if (this.collideTop() || this.collideBottom()) {
		this.velocity.y = -this.velocity.y * friction;
		if (this.collideTop()) this.y = this.radius;
		if (this.collideBottom()) this.y = 800 - this.radius;
		this.x += this.velocity.x * this.game.clockTick;
		this.y += this.velocity.y * this.game.clockTick;
	}

	for (var i = 0; i < this.game.entities.length; i++) {
		var ent = this.game.entities[i];

		if (ent instanceof Monster && this.collide(ent)) {
			this.game.entities[i].removeFromWorld = true;
		} else if (ent !== this && this.collide(ent)) {
			var temp = { x: this.velocity.x, y: this.velocity.y };

			var dist = distance(this, ent);
			var delta = this.radius + ent.radius - dist;
			var difX = (this.x - ent.x)/dist;
			var difY = (this.y - ent.y)/dist;

			this.x += difX * delta / 2;
			this.y += difY * delta / 2;
			ent.x -= difX * delta / 2;
			ent.y -= difY * delta / 2;

			this.velocity.x = ent.velocity.x * friction;
			this.velocity.y = ent.velocity.y * friction;
			ent.velocity.x = temp.x * friction;
			ent.velocity.y = temp.y * friction;
			this.x += this.velocity.x * this.game.clockTick;
			this.y += this.velocity.y * this.game.clockTick;
			ent.x += ent.velocity.x * this.game.clockTick;
			ent.y += ent.velocity.y * this.game.clockTick;
		}

		if (ent != this && this.collide({ x: ent.x, y: ent.y, radius: this.visualRadius })) {
			var dist = distance(this, ent);
			if (this.it && dist > this.radius + ent.radius + 10) {
				var difX = (ent.x - this.x)/dist;
				var difY = (ent.y - this.y)/dist;
				this.velocity.x += difX * acceleration / (dist*dist);
				this.velocity.y += difY * acceleration / (dist * dist);
				var speed = Math.sqrt(this.velocity.x*this.velocity.x + this.velocity.y*this.velocity.y);
				if (speed > maxSpeed) {
					var ratio = maxSpeed / speed;
					this.velocity.x *= ratio;
					this.velocity.y *= ratio;
				}
			}
			if (ent.it && dist > this.radius + ent.radius) {
				var difX = (ent.x - this.x) / dist;
				var difY = (ent.y - this.y) / dist;
				this.velocity.x -= difX * acceleration / (dist * dist);
				this.velocity.y -= difY * acceleration / (dist * dist);
				var speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
				if (speed > maxSpeed) {
					var ratio = maxSpeed / speed;
					this.velocity.x *= ratio;
					this.velocity.y *= ratio;
				}
			}
		}
	}


	this.velocity.x -= (1 - friction) * this.game.clockTick * this.velocity.x;
	this.velocity.y -= (1 - friction) * this.game.clockTick * this.velocity.y;
};

Bullet.prototype.draw = function () {
	this.animation.drawFrame(this.game.clockTick, this.ctx, this.x, this.y);
	Entity.prototype.draw.call(this);
}

var friction = 1;
var acceleration = 1000000;
var maxSpeed = 200;

var AM = new AssetManager();
var gameEngine = new GameEngine();

AM.queueDownload("./img/turret.png");
AM.queueDownload("./img/bullet.png");
AM.queueDownload("./img/monster2.png");

window.onload = function () {
	AM.downloadAll(function () {
		var canvas = document.getElementById("gameWorld");
		var ctx = canvas.getContext("2d");

		gameEngine.init(ctx);
		gameEngine.start();

		for (var i = 0; i < 5; i++) {
			switch(i) {
			case 0:
				var monster = new Monster(gameEngine, AM.getAsset("./img/monster2.png"), 500, 0);
				gameEngine.addEntity(monster);
				break;
			case 1:
				var monster = new Monster(gameEngine, AM.getAsset("./img/monster2.png"), 300, 0);
				gameEngine.addEntity(monster);
				break;
			case 2:
				var monster = new Monster(gameEngine, AM.getAsset("./img/monster2.png"), 450, 50);
				gameEngine.addEntity(monster);
				break;
			case 3:
				var monster = new Monster(gameEngine, AM.getAsset("./img/monster2.png"), 550, 200);
				gameEngine.addEntity(monster);
			case 4:
				var monster = new Monster(gameEngine, AM.getAsset("./img/monster2.png"), 700, 75);
				gameEngine.addEntity(monster);
			}

		}

		var turret = new Turret(gameEngine, AM.getAsset("./img/turret.png"), 10, 250);
		gameEngine.addEntity(turret);

		console.log("All Done!");
	});

	socket.on("load", function (data) {
		console.log(data);
		gameEngine.entities = [];
		var entities = data.gameData;

		var turret = new Turret(gameEngine, AM.getAsset("./img/turret.png"), 10, 250);
		gameEngine.addEntity(turret);

		for (var i = 0; i < entities.length; i++) {
			if (entities[i].type == "monster") {
				var monster = new Monster(gameEngine, AM.getAsset("./img/monster2.png"), entities[i].x, entities[i].y);
				gameEngine.addEntity(monster);
			} else if (entities[i].type == "bullet") {
				var bullet = new Bullet(gameEngine, AM.getAsset("./img/bullet.png"),  entities[i].x, entities[i].y);
				bullet.velocity = entities[i].velocity;
				bullet.speed = entities[i].speed;
				gameEngine.addEntity(bullet);
			}
		}

	});

	document.getElementById("saveButton").onclick = function() { 
		var save = {studentName: "Gabrielle Bly", stateName: "data", gameData: []};

		for (var i = 0; i < gameEngine.entities.length; i++) {
			if (gameEngine.entities[i] instanceof Monster) {
				var monster = gameEngine.entities[i];
				save.gameData.push({type: "monster", x: monster.x, y: monster.y});
			} else if (gameEngine.entities[i] instanceof Bullet) {
				var bullet = gameEngine.entities[i];
				save.gameData.push({type: "bullet", x: bullet.x, y: bullet.y, velocity: bullet.velocity, speed: bullet.speed});

			}
		}
		socket.emit("save", save);		
	};

	document.getElementById("loadButton").onclick = function() {
		socket.emit("load", {studentName: "Gabrielle Bly", stateName: "data"});
	};


	socket.on("connect", function () {
		console.log("Socket connected.")
	});
	socket.on("disconnect", function () {
		console.log("Socket disconnected.")
	});
	socket.on("reconnect", function () {
		console.log("Socket reconnected.")
	});

};
