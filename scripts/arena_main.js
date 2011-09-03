/**
 * Arena5 HTML canvas game.
 *
 * @author Kevin Roast
 * 
 * (C) 2011 Kevin Roast kevtoast@yahoo.com @kevinroast
 * 
 * Please see: license.txt
 * You are welcome to use this code, but I would appreciate an email or tweet
 * if you do anything interesting with it!
 */


// Globals
var DEBUG = false;
var SCOREDBKEY = "arena5-score-1.1";

// bind to window events
window.addEventListener('load', onloadHandler, false);

/**
 * Global window onload handler
 */
function onloadHandler()
{
   // Init our game with Game.Main derived instance.
   // Set min canvas size and border padding - which implies auto width/height
   // as the game arena can be scaled to window size
   GameHandler.init(400, 32);
   GameHandler.start(new Arena.Main());
}


/**
 * Arena root namespace.
 * 
 * @namespace Arena
 */
if (typeof Arena == "undefined" || !Arena)
{
   var Arena = {};
}


/**
 * Arena prerenderer class.
 * 
 * @namespace Arena
 * @class Arena.Prerenderer
 */
(function()
{
   Arena.Prerenderer = function()
   {
      this.images = [];
      this._renderers = [];
      return this;
   };
   
   Arena.Prerenderer.prototype =
   {
      /**
       * Image list. Keyed by renderer ID - returning an array also. So to get
       * the first image output by prerenderer with id "default": images["default"][0]
       * 
       * @public
       * @property images
       * @type Array
       */
      images: null,
      
      _renderers: null,
      
      /**
       * Add a renderer function to the list of renderers to execute
       * 
       * @param fn {function}    Callback to execute to perform prerender
       *                         Passed canvas element argument - to execute against - the
       *                         callback is responsible for setting appropriate width/height
       *                         of the buffer and should not assume it is cleared.
       *                         Should return Array of images from prerender process
       * @param id {string}      Id of the prerender - used to lookup images later
       */
      addRenderer: function addRenderer(fn, id)
      {
         this._renderers[id] = fn;
      },
      
      /**
       * Execute all prerender functions - call once all renderers have been added
       */
      execute: function execute()
      {
         var buffer = document.createElement('canvas');
         for (var id in this._renderers)
         {
            this.images[id] = this._renderers[id].call(this, buffer);
         }
      }
    };
})();


/**
 * Arena main game class.
 * 
 * @namespace Arena
 * @class Arena.Main
 */
(function()
{
   Arena.Main = function()
   {
      Arena.Main.superclass.constructor.call(this);
      
      // generate the single player actor - available across all scenes
      // TODO: init position etc. here is wrong - should be in the scene...
      this.player = new Arena.Player(new Vector(GameHandler.width / 2, GameHandler.height / 2), new Vector(0, 0), 0);
      
      // add the attractor scene
      this.scenes.push(new Arena.AttractorScene(this));
      
      // add a test level scene
      var level = new Arena.GameScene(this);
      this.scenes.push(level);
      
      // set special end scene member value to a Game Over scene
      this.endScene = new Arena.GameOverScene(this);
      
      // TODO: test getAnimationFrame...?
      this.fps = 40;
      
      // event handlers
      var me = this;
      var fMouseMove = function(e)
      {
         me.mousex = e.clientX;
         me.mousey = e.clientY;
      };
      GameHandler.canvas.addEventListener("mousemove", fMouseMove, false);
      /*var fMouseDown = function(e)
      {
         if (e.button == 0)
         {
            me.mouseleftbtn = true;
            return true;
         }
         if (e.button == 2)
         {
            me.mouserightbtn = true;
            return true;
         }
      };
      GameHandler.canvas.addEventListener("mousedown", fMouseDown, false);
      var fMouseUp = function(e)
      {
         if (e.button == 0)
         {
            me.mouseleftbtn = false;
            return true;
         }
         if (e.button == 2)
         {
            me.mouserightbtn = false;
            return true;
         }
      };
      GameHandler.canvas.addEventListener("mouseup", fMouseUp, false);*/
      
      if (DEBUG)
      {
         // attach handlers to debug checkboxes
         var setupDebugElement = function(id) {
               var el = document.getElementById("debug-" + id);
               el.addEventListener("change", function() {
                  DEBUG[id] = el.checked;
               }, false);
            };
         setupDebugElement("FPS");
         setupDebugElement("COLLISIONRADIUS");
         setupDebugElement("INVINCIBLE");
         setupDebugElement("DISABLEGLOWEFFECT");
         setupDebugElement("DISABLEAUTOFIRE");
      }
      
      // load high score from HTML5 local storage
      if (localStorage)
      {
         var highscore = localStorage.getItem(SCOREDBKEY);
         if (highscore)
         {
            this.highscore = highscore;
         }
      }
      
      // perform prerender steps - create some bitmap graphics to use later
      var pr = new Arena.Prerenderer();
      // function to generate a set of point particle images
      var fnPointRenderer = function(buffer, colour)
         {
            var imgs = [];
            for (var size=4; size<=10; size+=2)
            {
               var width = size << 1;
               buffer.width = buffer.height = width;
               var ctx = buffer.getContext('2d');
               var radgrad = ctx.createRadialGradient(size, size, size >> 1, size, size, size);  
               radgrad.addColorStop(0, colour);
               radgrad.addColorStop(1, "#000");
               ctx.fillStyle = radgrad;
               ctx.fillRect(0, 0, width, width);
               var img = new Image();
               img.src = buffer.toDataURL("image/png");
               imgs.push(img);
            }
            return imgs;
         };
      // add the various point particle image prerenderers based on above function
      // default explosion colour
      pr.addRenderer(function(buffer) {
            return fnPointRenderer.call(this, buffer, "rgb(255,125,50)");
         }, "points_rgb(255,125,50)");
      // Tracker: enemy particles
      pr.addRenderer(function(buffer) {
            return fnPointRenderer.call(this, buffer, "rgb(255,96,0)");
         }, "points_rgb(255,96,0)");
      // Borg: enemy particles
      pr.addRenderer(function(buffer) {
            return fnPointRenderer.call(this, buffer, "rgb(0,255,64)");
         }, "points_rgb(0,255,64)");
      // Splitter: enemy particles
      pr.addRenderer(function(buffer) {
            return fnPointRenderer.call(this, buffer, "rgb(148,0,255)");
         }, "points_rgb(148,0,255)");
      // Bomber: enemy particles
      pr.addRenderer(function(buffer) {
            return fnPointRenderer.call(this, buffer, "rgb(255,0,255)");
         }, "points_rgb(255,0,255)");
      // add the smudge explosion particle image prerenderer
      pr.addRenderer(function(buffer) {
            var imgs = [];
            for (var size=8; size<=64; size+=8)
            {
               var width = size << 1;
               buffer.width = buffer.height = width;
               var ctx = buffer.getContext('2d');
               var radgrad = ctx.createRadialGradient(size, size, size >> 3, size, size, size);  
               radgrad.addColorStop(0, "rgb(255,125,50)");
               radgrad.addColorStop(1, "#000");
               ctx.fillStyle = radgrad;
               ctx.fillRect(0, 0, width, width);
               var img = new Image();
               img.src = buffer.toDataURL("image/png");
               imgs.push(img);
            }
            return imgs;
         }, "smudges");
      pr.execute();
      GameHandler.prerenderer = pr;
   };
   
   extend(Arena.Main, Game.Main,
   {
      /**
       * Reference to the single game player actor
       */
      player: null,
      
      /**
       * Lives count
       */
      lives: 1,
      
      /**
       * Current game score 
       */
      score: 0,
      
      /**
       * High score
       */
      highscore: 0,
      
      /**
       * Last score
       */
      lastscore: 0,
      
      /**
       * Current multipler
       */
      scoreMultiplier: 1,
      
      mousex: 0,
      mousey: 0,
      mouseleftbtn: false,
      mouserightbtn: false,
      
      /**
       * Main game loop event handler method.
       */
      onRenderGame: function onRenderGame(ctx)
      {
         ctx.clearRect(0, 0, GameHandler.width, GameHandler.height);
      },
      
      isGameOver: function isGameOver()
      {
         var over = (this.lives === 0 && (this.currentScene.effects && this.currentScene.effects.length === 0));
         if (over)
         {
            // reset player ready for game restart
            this.lastscore = this.score;
            this.score = 0;
            this.scoreMultiplier = 1;
            this.lives = 1;
         }
         return over;
      }
   });
})();


/**
 * Arena Attractor scene class.
 * 
 * @namespace Arena
 * @class Arena.AttractorScene
 */
(function()
{
   Arena.AttractorScene = function(game)
   {
      this.game = game;
      this.starfield = [];
      // generate warp starfield background
      for (var star, i=0; i<this.STARFIELD_SIZE; i++)
      {
         star = new Arena.Star(); 
         star.init();
         this.starfield.push(star);
      }
      
      // scene renderers
      // display welcome text, info text and high scores
      this.sceneRenderers = [];
      this.sceneRenderers.push(this.sceneRendererWelcome);
      this.sceneRenderers.push(this.sceneRendererInfo);
      this.sceneRenderers.push(this.sceneRendererScores);
      
      // allow start via mouse click - useful for testing on touch devices
      var me = this;
      var fMouseDown = function(e)
      {
         if (e.button == 0)
         {
            me.start = true;
            return true;
         }
      };
      GameHandler.canvas.addEventListener("mousedown", fMouseDown, false);
      
      Arena.AttractorScene.superclass.constructor.call(this, false, null);
   };
   
   extend(Arena.AttractorScene, Game.Scene,
   {
      STARFIELD_SIZE: 100,
      SCENE_LENGTH: 500,
      SCENE_FADE: 100,
      game: null,
      start: false,
      fadeRGB: 0,
      fadeIncrement: 0,
      sceneRenderers: null,
      currentSceneRenderer: 0,
      currentSceneFrame: 0,
      
      /**
       * Background starfield star list
       */
      starfield: null,
      
      /**
       * Scene completion polling method
       */
      isComplete: function isComplete()
      {
         return this.start;
      },
      
      onInitScene: function onInitScene()
      {
         this.start = false;
         this.fadeRGB = 0;
         this.fadeIncrement = 0.01;
         this.currentSceneRenderer = 0;
         this.currentSceneFrame = 0;
      },
      
      onRenderScene: function onRenderScene(ctx)
      {
         // update and render background starfield effect
         ctx.save();
         ctx.shadowBlur = 0;
         ctx.globalAlpha = 0.333;
         ctx.fillStyle = "#000";
         ctx.fillRect(0, 0, GameHandler.width, GameHandler.height);
         this.updateStarfield(ctx);                      
         ctx.restore();
         
         // manage scene renderer
         if (++this.currentSceneFrame === this.SCENE_LENGTH)
         {
            if (++this.currentSceneRenderer === this.sceneRenderers.length)
            {
               this.currentSceneRenderer = 0;
            }
            this.currentSceneFrame = 0;
         }
         ctx.save();
         // fade in/out
         if (this.currentSceneFrame < this.SCENE_FADE)
         {
            // fading in
            ctx.globalAlpha = 1 - ((this.SCENE_FADE - this.currentSceneFrame) / this.SCENE_FADE);
         }
         else if (this.currentSceneFrame >= this.SCENE_LENGTH - this.SCENE_FADE)
         {
            // fading out
            ctx.globalAlpha = ((this.SCENE_FADE - this.currentSceneFrame) / this.SCENE_FADE);
         }
         // render scene using renderer function
         this.sceneRenderers[this.currentSceneRenderer].call(this, ctx);
         ctx.restore();
      },
      
      sceneRendererWelcome: function sceneRendererWelcome(ctx)
      {
         // Arena5 and Start text
         var ff = ~~(48 * this.world.scale * 2) + "pt Arial";
         Game.centerFillText(ctx, "Arena5", ff, GameHandler.height*0.5 - 24, "white");
         this.fadeRGB += this.fadeIncrement;
         if (this.fadeRGB > 1.0)
         {
            this.fadeRGB = 1.0;
            this.fadeIncrement = -this.fadeIncrement;
         }
         else if (this.fadeRGB < 0)
         {
            this.fadeRGB = 0;
            this.fadeIncrement = -this.fadeIncrement;
         }
         var colour = "rgba(255,255,255," + this.fadeRGB + ")";
         ff = ~~(18 * this.world.scale * 2) + "pt Arial";
         Game.centerFillText(ctx, "Press SPACE to start", ff, GameHandler.height*0.5 + 12, colour);
      },
      
      sceneRendererInfo: function sceneRendererInfo(ctx)
      {
         var ypos = ~~(150 * this.world.scale * 2);
         ctx.fillStyle = "white";
         ctx.font = ~~(24 * this.world.scale * 2) + "pt Arial";
         ctx.fillText("How to play...", GameHandler.width * 0.2, ypos);
         ctx.font = ~~(12 * this.world.scale * 2) + "pt Arial";
         ypos += ~~(32 * this.world.scale * 2);
         ctx.fillText("Use the WASD or cursor keys to move your ship.", GameHandler.width * 0.15, ypos);
         ypos += ~~(20 * this.world.scale * 2);
         ctx.fillText("Use the mouse to direct your automatic weapons.", GameHandler.width * 0.15, ypos);
         ypos += ~~(20 * this.world.scale * 2);
         ctx.fillText("Dodge the enemy ships that will try to destroy you!", GameHandler.width * 0.15, ypos);
         ypos += ~~(20 * this.world.scale * 2);
         ctx.fillText("Pickup the score multipliers dropped by enemies.", GameHandler.width * 0.15, ypos);
      },
      
      sceneRendererScores: function sceneRendererScores(ctx)
      {
         var ypos = ~~(150 * this.world.scale * 2);
         ctx.fillStyle = "white";
         ctx.font = ~~(24 * this.world.scale * 2) + "pt Courier New";
         var txt = "High Score";
         ctx.fillText(txt, (GameHandler.width - ctx.measureText(txt).width) / 2, ypos);
         ypos += ~~(64 * this.world.scale * 2);
         var sscore = this.game.highscore.toString();
         // pad with zeros
         for (var i=0, j=8-sscore.length; i<j; i++)
         {
            sscore = "0" + sscore;
         }
         ctx.fillText(sscore, (GameHandler.width - ctx.measureText(sscore).width) / 2, ypos);
      },
      
      /**
       * Update each individual star in the starfield background
       */
      updateStarfield: function updateStarfield(ctx)
      {
         for (var i=0, j=this.starfield.length; i<j; i++)
         {
            this.starfield[i].updateAndRender(i, ctx);
         }
      },
      
      onKeyDownHandler: function onKeyDownHandler(keyCode)
      {
         switch (keyCode)
         {
            case KEY.SPACE:
            {
               this.start = true;
               return true; break;
            }
            case KEY.ESC:
            {
               GameHandler.pause();
               return true; break;
            }
         }
      }
   });
})();


/**
 * Arena GameOver scene class.
 * 
 * @namespace Arena
 * @class Arena.GameOverScene
 */
(function()
{
   Arena.GameOverScene = function(game)
   {
      this.game = game;
      this.player = game.player;
      
      // construct the interval to represent the Game Over text effect
      var interval = new Game.Interval("GAME OVER", this.intervalRenderer);
      Arena.GameOverScene.superclass.constructor.call(this, false, interval);
   };
   
   extend(Arena.GameOverScene, Game.Scene,
   {
      game: null,
      
      /**
       * Scene completion polling method
       */
      isComplete: function isComplete()
      {
         return true;
      },
      
      intervalRenderer: function intervalRenderer(interval, ctx)
      {
         if (interval.framecounter++ === 0)
         {
            if (this.game.lastscore === this.game.highscore)
            {
               // save new high score to HTML5 local storage
               if (localStorage)
               {
                  localStorage.setItem(SCOREDBKEY, this.game.lastscore);
               }
            }
         }
         if (interval.framecounter < 150)
         {
            Game.centerFillText(ctx, interval.label, Game.fontFamily(this.world, 18), GameHandler.height*0.5 - 9, "white");
            Game.centerFillText(ctx, "Score: " + this.game.lastscore, Game.fontFamily(this.world, 14), GameHandler.height*0.5 + 32, "white");
            if (this.game.lastscore === this.game.highscore)
            {
               Game.centerFillText(ctx, "New High Score!", Game.fontFamily(this.world, 14), GameHandler.height*0.5 + 64, "white");
            }
         }
         else
         {
            interval.complete = true;
         }
      }
   });
})();


/**
 * Arena Game scene class.
 * 
 * @namespace Arena
 * @class Arena.GameScene
 */
(function()
{
   Arena.GameScene = function(game)
   {
      this.game = game;
      this.player = game.player;
      
      this.waves = [
         {
            enemyMax: 5,
            enemyWeighting: [0,0,0,1,1,1,2],
            lifetime: 20
         },
         {
            enemyMax: 5,
            enemyWeighting: [0,0,1,1,2,3],
            lifetime: 20
         },
         {
            enemyMax: 5,
            enemyWeighting: [2],
            lifetime: 10
         },
         {
            enemyMax: 8,
            enemyWeighting: [0,1,1,2,2,3,3],
            lifetime: 20
         },
         {
            enemyMax: 8,
            enemyWeighting: [3],
            lifetime: 10
         },
         {
            enemyMax: 10,
            enemyWeighting: [1,2,5],
            lifetime: 20
         },
         {
            enemyMax: 10,
            enemyWeighting: [1,1,2,2,3,5],
            lifetime: 20
         },
         {
            enemyMax: 10,
            enemyWeighting: [2,4,6],
            lifetime: 10
         },
         {
            enemyMax: 10,
            enemyWeighting: [1,1,2,2,4,5],
            lifetime: 20
         },
         {
            enemyMax: 10,
            enemyWeighting: [3,4,6],
            lifetime: 10
         },
         {
            enemyMax: 10,
            enemyWeighting: [4,5,6],
            lifetime: 20
         },
         // infinite last wave!
         {
            enemyMax: 12,
            enemyWeighting: [1,2,3,4,5,6],
            lifetime: 0
         }
      ];
      
      this.inputBinding = {};
      this.inputBinding[KEY.A] = 'moveLeft';
      this.inputBinding[KEY.D] = 'moveRight';
      this.inputBinding[KEY.W] = 'moveUp';
      this.inputBinding[KEY.S] = 'moveDown';
      this.inputBinding[KEY.LEFT] = 'fireLeft';
      this.inputBinding[KEY.RIGHT] = 'fireRight';
      this.inputBinding[KEY.UP] = 'fireUp',
      this.inputBinding[KEY.DOWN] = 'fireDown';
      
      var interval = new Game.Interval("ENTER THE ARENA!", this.intervalRenderer);
      Arena.GameScene.superclass.constructor.call(this, true, interval);
   };
   
   extend(Arena.GameScene, Game.Scene,
   {
      game: null,
      waves: null,
      currentWave: 0,
      enemyKills: 0,
      timeInScene: 0,
      input: {
         moveLeft: false,
         moveRight: false,
         moveUp: false,
         moveDown: false,
         fireLeft: false,
         fireRight: false,
         fireUp: false,
         fireDown: false
      },
 
      /**
       * Initialize input flags
       */
      initInput: function() {
         for (var i in this.input) {
            this.input[i] = false;
         };
      },
      
      /**
       * Binding of keys to input values
       */
      inputBinding: null,
      
      getBinding: function(keyCode) {
         return this.inputBinding[keyCode];
      },
      
      /**
       * Local reference to the game player actor
       */
      player: null,
      
      /**
       * Top-level list of game actors sub-lists
       */
      actors: null,
      
      /**
       * List of player fired bullet actors
       */
      playerBullets: null,
      
      /**
       * List of enemy actors (asteroids, ships etc.)
       */
      enemies: null,
      
      /**
       * List of enemy fired bullet actors
       */
      enemyBullets: null,
      
      /**
       * List of effect actors
       */
      effects: null,
      
      /**
       * List of collectables actors
       */
      collectables: null,
      
      /**
       * Displayed score (animates towards actual score)
       */
      scoredisplay: 0,
      
      /**
       * Scene init event handler
       */
      onInitScene: function onInitScene()
      {
         // generate the actors and add the actor sub-lists to the main actor list
         this.actors = [];
         this.actors.push(this.enemies = []);
         this.actors.push(this.playerBullets = []);
         this.actors.push(this.enemyBullets = []);
         this.actors.push(this.effects = []);
         this.actors.push(this.collectables = []);
         
         // start view centered in the game world
         this.world.viewx = this.world.viewy = (this.world.size / 2) - (this.world.viewsize / 2);
         
         // reset player
         this.resetPlayerActor();
         
         // reset wave
         this.currentWave = 0;
         this.enemyKills = 0;
         this.timeInScene = Date.now();
         
         // reset interval
         this.interval.reset();
         
         this.skipLevel = false;
      },
      
      /**
       * Restore the player to the game - reseting position etc.
       */
      resetPlayerActor: function resetPlayerActor(persistPowerUps)
      {
         this.actors.push([this.player]);
         
         // reset the player position - centre of world
         with (this.player)
         {
            position.x = position.y = this.world.size / 2;
            vector.x = vector.y = heading = 0;
            reset(persistPowerUps);
         }
         
         // reset keyboard input values
         this.initInput();
      },
      
      /**
       * Scene before rendering event handler
       */
      onBeforeRenderScene: function onBeforeRenderScene()
      {
         var p = this.player,
             w = this.world;
         
         // upgrade weapon powerup based enemy killed count
         if (this.game.score > 10000 && p.primaryWeapons["main"].bulletCount === 1)
         {
            p.primaryWeapons["main"].bulletCount = 2;
            this.effects.push(new Arena.TextIndicator(
               this.screenCenterVector(), new Vector(0, -5.0), "POWERUP X1!", 32, "white", 64));
         }
         if (this.game.score > 50000 && p.primaryWeapons["main"].bulletCount === 2)
         {
            p.primaryWeapons["main"].bulletCount = 3;
            this.effects.push(new Arena.TextIndicator(
               this.screenCenterVector(), new Vector(0, -5.0), "POWERUP X2!", 32, "white", 64));
         }
         
         // handle input: make the player move and shoot
         p.handleInput(this.input);
         
         if (p.fireAngle !== null)
         {
            p.firePrimary(this.playerBullets);
         }
         
         // TODO: click to fire secondary weapons?
         
         // update view position based on new player position
         var viewedge = w.viewsize * 0.2;
         if (p.position.x > viewedge && p.position.x < w.size - viewedge)
         {
            w.viewx = p.position.x - w.viewsize * 0.5;
         }
         if (p.position.y > viewedge && p.position.y < w.size - viewedge)
         {
            w.viewy = p.position.y - w.viewsize * 0.5;
         }
         
         // ensure enemy count is as appropriate for the current wave
         var wave = this.waves[this.currentWave],
             now = Date.now();
         if (wave.lifetime !== 0 && (now > this.timeInScene + (wave.lifetime * 1000) || this.skipLevel))
         {
            this.skipLevel = false;
            
            // increment wave
            wave = this.waves[++this.currentWave];
            this.timeInScene = now;
            
            // display wave text effect in the center of the game screen
            var vec = new Vector(0, -5.0);
            this.effects.push(new Arena.TextIndicator(
               this.screenCenterVector(), vec, ("WAVE " + (this.currentWave+1)), 32, "white", 64));
         }
         while (this.enemies.length < wave.enemyMax)
         {
            this.enemies.push(new Arena.EnemyShip(
               this, wave.enemyWeighting[randomInt(0, wave.enemyWeighting.length-1)]));
         }
         
         // update all actors using their current vector in the game world
         this.updateActors();
      },
      
      /**
       * Scene rendering event handler
       */
      onRenderScene: function onRenderScene(ctx)
      {
         ctx.clearRect(0, 0, GameHandler.width, GameHandler.height);
         
         // glowing vector effect shadow
         ctx.shadowBlur = (DEBUG && DEBUG.DISABLEGLOWEFFECT) ? 0 : 8;
         
         // render background effect - wire grid
         this.renderBackground(ctx);
         
         // render the game actors
         this.renderActors(ctx);
         
         if (DEBUG && DEBUG.COLLISIONRADIUS)
         {
            this.renderCollisionRadius(ctx);
         }
         
         // render info overlay graphics
         this.renderOverlay(ctx);
         
         // detect bullet collisions
         this.collisionDetectBullets();
         
         // detect player collision with enemies etc.
         if (!this.player.expired())
         {
            this.collisionDetectPlayer();
         }
         else
         {
            // if the player died, then respawn after a short delay and
            // ensure that they do not instantly collide with an enemy
            if (this.player.killedOnFrame + 100 < GameHandler.frameCount)
            {
               // remove enemies before respawn - clear the array
               this.enemies.length = 0;
               this.resetPlayerActor();
            }
         }
      },
      
      intervalRenderer: function intervalRenderer(interval, ctx)
      {
         if (interval.framecounter++ < 50)
         {
            Game.centerFillText(ctx, interval.label, Game.fontFamily(this.world, 18), GameHandler.height/2 - 9, "white");
         }
         else
         {
            interval.complete = true;
         }
      },
      
      /**
       * Scene onKeyDownHandler method
       */
      onKeyDownHandler: function onKeyDownHandler(keyCode)
      {
         var binding = this.getBinding(keyCode);
         if (binding) {
            this.input[binding] = true;
            return true;
         }
         else {
            switch (keyCode)
            {
               // special keys - key press state not maintained between frames
               case KEY.L:
               {
                  if (DEBUG) this.skipLevel = true;
                  return true; break;
               }
               case KEY.ESC:
               {
                  GameHandler.pause();
                  return true; break;
               }

               // TEMP - ARENA VIEW MANIPULATION AND TESTING
               case KEY.OPENBRACKET:
               {
                  if (this.world.viewsize > 500)
                  {
                     this.world.viewsize -= 100;
                  }
                  return true; break;
               }
               case KEY.CLOSEBRACKET:
               {
                  if (this.world.viewsize < 1500)
                  {
                     this.world.viewsize += 100;
                  }
                  return true; break;
               }
            }
         }
      },
      
      /**
       * Scene onKeyUpHandler method
       */
      onKeyUpHandler: function onKeyUpHandler(keyCode)
      {
         var binding = this.getBinding(keyCode);
         if (binding) {
            this.input[binding] = false;
            return true;
         }
      },
      
      /**
       * Render background effects for the scene
       */
      renderBackground: function renderBackground(ctx)
      {
         // render background effect - wire grid
         // manually transform world to screen for this effect and therefore
         // assume there is a horizonal and vertical "wire" every N units
         ctx.save();
         ctx.strokeStyle = "rgb(0,30,60)";
         ctx.lineWidth = 1.0;
         ctx.shadowBlur = 0;
         ctx.beginPath();
         
         var UNIT = 100;
         var w = this.world;
             xoff = UNIT - w.viewx % UNIT,
             yoff = UNIT - w.viewy % UNIT,
             // calc top left edge of world (prescaled)
             x1 = (w.viewx >= 0 ? 0 : -w.viewx) * w.scale,
             y1 = (w.viewy >= 0 ? 0 : -w.viewy) * w.scale,
             // calc bottom right edge of world (prescaled)
             x2 = (w.viewx < w.size - w.viewsize ? w.viewsize : w.size - w.viewx) * w.scale,
             y2 = (w.viewy < w.size - w.viewsize ? w.viewsize : w.size - w.viewy) * w.scale;
         
         // plot the grid wires that make up the background
         for (var i=0, j=w.viewsize/UNIT; i<j; i++)
         {
            // check we are in bounds of the visible world before drawing grid line segments
            if (xoff + w.viewx > 0 && xoff + w.viewx < w.size)
            {
               ctx.moveTo(xoff * w.scale, y1);
               ctx.lineTo(xoff * w.scale, y2);
            }
            if (yoff + w.viewy > 0 && yoff + w.viewy < w.size)
            {
               ctx.moveTo(x1, yoff * w.scale);
               ctx.lineTo(x2, yoff * w.scale);
            }
            xoff += UNIT;
            yoff += UNIT;
         }
         
         ctx.closePath();
         ctx.stroke();
         
         // render world edges
         ctx.strokeStyle = "rgb(60,128,90)";
         ctx.lineWidth = 1;
         ctx.beginPath();
         
         if (w.viewx <= 0)
         {
            xoff = -w.viewx;
            ctx.moveTo(xoff * w.scale, y1);
            ctx.lineTo(xoff * w.scale, y2);
         }
         else if (w.viewx >= w.size - w.viewsize)
         {
            xoff = w.size - w.viewx;
            ctx.moveTo(xoff * w.scale, y1);
            ctx.lineTo(xoff * w.scale, y2);
         }
         if (w.viewy <= 0)
         {
            yoff = -w.viewy;
            ctx.moveTo(x1, yoff * w.scale);
            ctx.lineTo(x2, yoff * w.scale);
         }
         else if (w.viewy >= w.size - w.viewsize)
         {
            yoff = w.size - w.viewy;
            ctx.moveTo(x1, yoff * w.scale);
            ctx.lineTo(x2, yoff * w.scale);
         }
         
         ctx.closePath();
         ctx.stroke();
         ctx.restore();
      },
      
      /**
       * Update the scene actors based on current vectors and expiration.
       */
      updateActors: function updateActors()
      {
         for (var i = 0, j = this.actors.length; i < j; i++)
         {
            var actorList = this.actors[i];
            
            for (var n = 0; n < actorList.length; n++)
            {
               var actor = actorList[n];
               
               // call onUpdate() event for each actor
               actor.onUpdate(this);
               
               // expiration test first
               if (actor.expired())
               {
                  actorList.splice(n, 1);
               }
               else
               {
                  // update actor using its current vector
                  actor.position.add(actor.vector);
                  
                  // TODO: different behavior for traversing out of the world space?
                  //       add behavior flag to Actor i.e. bounce, invert, disipate etc.
                  //       - could add method to actor itself - so would handle internally...
                  if (actor === this.player)
                  {
                     if (actor.position.x >= this.world.size ||
                         actor.position.x < 0 ||
                         actor.position.y >= this.world.size ||
                         actor.position.y < 0)
                     {
                        actor.vector.invert();
                        actor.vector.scale(0.75);
                        actor.position.add(actor.vector);
                     }
                  }
                  else
                  {
                     var bounceX = false,
                         bounceY = false;
                     if (actor.position.x >= this.world.size)
                     {
                        actor.position.x = this.world.size;
                        bounceX = true;
                     }
                     else if (actor.position.x < 0)
                     {
                        actor.position.x = 0;
                        bounceX = true;
                     }
                     if (actor.position.y >= this.world.size)
                     {
                        actor.position.y = this.world.size;
                        bounceY = true;
                     }
                     else if (actor.position.y < 0)
                     {
                        actor.position.y = 0;
                        bounceY = true
                     }
                     // bullets don't bounce - create an effect at the arena boundry instead
                     if ((bounceX || bounceY) &&
                         ((actor instanceof Arena.Bullet && !this.player.bounceWeapons) ||
                          actor instanceof Arena.EnemyBullet))
                     {
                        // replace bullet with a particle effect at the same position and vector
                        var vec = actor.vector.nscale(0.5);
                        this.effects.push(new Arena.BulletImpactEffect(actor.position.clone(), vec));
                        // remove bullet actor from play
                        actorList.splice(n, 1);
                     }
                     else
                     {
                        if (bounceX)
                        {
                           var h = actor.vector.thetaTo2(new Vector(0, 1));
                           actor.vector.rotate(h*2);
                           actor.vector.scale(0.9);
                           actor.position.add(actor.vector);
                           // TODO: add "interface" for actor with heading?
                           //       or is hasProperty() more "javascript"
                           if (actor.hasOwnProperty("heading")) actor.heading += (h*2)/RAD;
                        }
                        if (bounceY)
                        {
                           var h = actor.vector.thetaTo2(new Vector(1, 0));
                           actor.vector.rotate(h*2);
                           actor.vector.scale(0.9);
                           actor.position.add(actor.vector);
                           if (actor.hasOwnProperty("heading")) actor.heading += (h*2)/RAD;
                        }
                     }
                  }
               }
            }
         }
      },
      
      /**
       * Detect player collisions with various actor classes
       * including Enemies, bullets and collectables etc.
       */
      collisionDetectPlayer: function collisionDetectPlayer()
      {
         var playerRadius = this.player.radius;
         var playerPos = this.player.position;
         
         // test circle intersection with each enemy
         for (var n = 0, m = this.enemies.length; n < m; n++)
         {
            var enemy = this.enemies[n];
            
            // calculate distance between the two circles
            if (playerPos.distance(enemy.position) <= playerRadius + enemy.radius)
            {
               if (!(DEBUG && DEBUG.INVINCIBLE))
               {
                  // reduce energy by appropriate level for enemy
                  this.player.damageBy(enemy);
               }
               
               // apply impact to player from the enemy vector due to collision
               this.player.vector.add(enemy.vector.nscale(0.5));
               
               // destroy enemy from impact - no score though for this!
               enemy.damageBy(-1);
               this.destroyEnemy(enemy, this.player.vector, false);
               
               if (!this.player.alive)
               {
                  // oh dear, player is dead, deduct a life
                  this.game.lives--;
                  
                  // replace player with explosion
                  var boom = new Arena.PlayerExplosion(this.player.position.clone(), this.player.vector.clone());
                  this.effects.push(boom);
               }
            }
         }
         
         // test intersection with each enemy bullet
         for (var i = 0; i < this.enemyBullets.length; i++)
         {
            var bullet = this.enemyBullets[i];
            
            // calculate distance between the two circles
            if (playerPos.distance(bullet.position) <= playerRadius + bullet.radius)
            {
               // remove this bullet from the actor list as it has been destroyed
               this.enemyBullets.splice(i, 1);
               
               if (!(DEBUG && DEBUG.INVINCIBLE))
               {
                  // reduce energy by appropriate level for bullet
                  this.player.damageBy(bullet);
               }
               
               // apply impact to player from the enemy vector due to collision
               this.player.vector.add(bullet.vector.nscale(0.2));
               
               // show an effect for the bullet impact
               this.effects.push(new Arena.BulletImpactEffect(bullet.position.clone(), bullet.vector.nscale(0.5)));
               
               if (!this.player.alive)
               {
                  // oh dear, player is dead, deduct a life
                  this.game.lives--;
                  
                  // replace player with explosion
                  var boom = new Arena.PlayerExplosion(this.player.position.clone(), this.player.vector.clone());
                  this.effects.push(boom);
               }
            }
         }
         
         // test intersection with each collectable
         for (var i = 0; i < this.collectables.length; i++)
         {
            var item = this.collectables[i];
            
            // calculate distance between the two circles
            if (playerPos.distance(item.position) <= playerRadius + item.radius)
            {
               // collision detected - remove item from play and activate it
               this.collectables.splice(i, 1);
               item.collected(this.game, this.player, this);
            }
         }
      },
      
      /**
       * Detect bullet collisions with enemy actors.
       */
      collisionDetectBullets: function collisionDetectBullets()
      {
         var bullet, bulletRadius, bulletPos;
         
         // collision detect player bullets with enemies
         // NOTE: test length each loop as list length can change
         for (var i = 0; i < this.playerBullets.length; i++)
         {
            bullet = this.playerBullets[i];
            bulletRadius = bullet.radius;
            bulletPos = bullet.position;
            
            // test circle intersection with each enemy actor
            for (var n = 0, m = this.enemies.length, enemy, z; n < m; n++)
            {
               enemy = this.enemies[n];
               
               // test the distance against the two radius combined
               if (bulletPos.distance(enemy.position) <= bulletRadius + enemy.radius)
               {
                  // test for area effect bomb weapon
                  var effectRad = bullet.effectRadius();
                  //if (effectRad === 0)
                  {
                     // impact the enemy with the bullet - may destroy it or just damage it
                     if (enemy.damageBy(bullet.power()))
                     {
                        // destroy the enemy under the bullet
                        this.destroyEnemy(enemy, bullet.vector, true);
                        this.generateMultiplier(enemy);
                        //this.generatePowerUp(enemy);
                     }
                     else
                     {
                        // add bullet impact effect to show the bullet hit
                        var effect = new Arena.EnemyImpact(
                           bullet.position.clone(),
                           bullet.vector.nscale(0.5 + Rnd() * 0.5), enemy);
                        this.effects.push(effect);
                     }
                  }
                  /*else
                  {
                     // inform enemy it has been hit by a instant kill weapon
                     enemy.damageBy(-1);
                     this.generatePowerUp(enemy);
                     
                     // add a big explosion actor at the area weapon position and vector
                     var boom = new Asteroids.Explosion(
                           bullet.position.clone(), bullet.vector.clone().scale(0.5), 5);
                     this.effects.push(boom);
                     
                     // destroy the enemy
                     this.destroyEnemy(enemy, bullet.vector, true);
                     
                     // wipe out nearby enemies under the weapon effect radius
                     for (var x = 0, z = this.enemies.length, e; x < z; x++)
                     {
                        e = this.enemies[x];
                        
                        // test the distance against the two radius combined
                        if (bulletPos.distance(e.position) <= effectRad + e.radius)
                        {
                           e.damageBy(-1);
                           //this.generatePowerUp(e);
                           this.destroyEnemy(e, bullet.vector, true);
                        }
                     }
                  }*/
                  
                  // remove this bullet from the actor list as it has been destroyed
                  this.playerBullets.splice(i, 1);
                  break;
               }
            }
         }
      },
      
      /**
       * Destroy an enemy. Replace with appropriate effect.
       * Also applies the score for the destroyed item if the player caused it.
       * 
       * @param enemy {Game.EnemyActor} The enemy to destory and add score for
       * @param parentVector {Vector} The vector of the item that hit the enemy
       * @param player {boolean} If true, the player was the destroyer
       */
      destroyEnemy: function destroyEnemy(enemy, parentVector, player)
      {
         // add an explosion actor at the enemy position and vector
         var vec = enemy.vector.clone();
         // add scaled parent vector - to give some momentum from the impact
         vec.add(parentVector.nscale(0.2));
         this.effects.push(new Arena.EnemyExplosion(enemy.position.clone(), vec, enemy));
         
         if (player)
         {
            // increment score
            var inc = (enemy.scoretype + 1) * 5 * this.game.scoreMultiplier;
            this.game.score += inc;
            
            // generate a score effect indicator at the destroyed enemy position
            var vec = new Vector(0, -5.0).add(enemy.vector.nscale(0.5));
            this.effects.push(new Arena.ScoreIndicator(
                  new Vector(enemy.position.x, enemy.position.y - 16), vec, inc));
            
            // call event handler for enemy
            enemy.onDestroyed(this, player);
         }
         
         this.enemyKills++;
      },
      
      /**
       * Generate score multiplier(s) to pickup after enemy is destroyed
       */
      generateMultiplier: function generateMultiplier(enemy)
      {
         if (enemy.dropsMutliplier)
         {
            var count = randomInt(1, (enemy.type < 5 ? enemy.type : 4));
            for (var i=0; i<count; i++)
            {
               this.collectables.push(new Arena.Multiplier(enemy.position.clone(),
                  enemy.vector.nscale(0.2).rotate(Rnd() * TWOPI)));
            }
         }
      },
      
      /**
       * Render each actor to the canvas.
       * 
       * @param ctx {object} Canvas rendering context
       */
      renderActors: function renderActors(ctx)
      {
         for (var i = 0, j = this.actors.length; i < j; i++)
         {
            // walk each sub-list and call render on each object
            var actorList = this.actors[i];
            
            for (var n = actorList.length - 1; n >= 0; n--)
            {
               actorList[n].onRender(ctx, this.world);
            }
         }
      },
      
      /**
       * DEBUG - Render the radius of the collision detection circle around each actor.
       * 
       * @param ctx {object} Canvas rendering context
       */
      renderCollisionRadius: function renderCollisionRadius(ctx)
      {
         ctx.save();
         ctx.strokeStyle = "rgb(255,0,0)";
         ctx.lineWidth = 0.5;
         
         for (var i = 0, j = this.actors.length; i < j; i++)
         {
            var actorList = this.actors[i];
            for (var n = actorList.length - 1, actor; n >= 0; n--)
            {
               actor = actorList[n];
               if (actor.radius)  // filter out effects etc. that are not "alive" in the game world
               {
                  var viewposition = Game.worldToScreen(actor.position, this.world, actor.radius);
                  if (viewposition)
                  {
                     ctx.save();
                     ctx.translate(viewposition.x, viewposition.y);
                     ctx.beginPath();
                     ctx.arc(0, 0, actor.radius * this.world.scale, 0, TWOPI, true);
                     ctx.closePath();
                     ctx.stroke();
                     ctx.restore();
                  }
               }
            }
         }
         
         ctx.restore();
      },
      
      /**
       * Render player information HUD overlay graphics.
       * 
       * @param ctx {object} Canvas rendering context
       */
      renderOverlay: function renderOverlay(ctx)
      {
         var w = this.world,
             width = GameHandler.width,
             height = GameHandler.height;
         
         ctx.save();
         ctx.shadowBlur = 0;
         
         // energy bar (scaled down from player energy max)
         var ewidth = ~~(100 * w.scale * 2),
             eheight = ~~(4 * w.scale * 2);
         ctx.strokeStyle = "rgb(128,128,50)";
         ctx.strokeRect(4, 4, ewidth+1, 4 + eheight);
         ctx.fillStyle = "rgb(255,255,150)";
         ctx.fillRect(5, 5, (this.player.energy / (this.player.ENERGY_INIT / ewidth)), 3 + eheight);
         
         // score display - update towards the score in increments to animate it
         var font12pt = Game.fontFamily(w, 12),
             font12size = Game.fontSize(w, 12);
         var score = this.game.score,
             inc = (score - this.scoredisplay) * 0.1;
         this.scoredisplay += inc;
         if (this.scoredisplay > score)
         {
            this.scoredisplay = score;
         }
         var sscore = Ceil(this.scoredisplay).toString();
         // pad with zeros
         for (var i=0, j=8-sscore.length; i<j; i++)
         {
            sscore = "0" + sscore;
         }
         Game.fillText(ctx, sscore, font12pt, width * 0.2 + width * 0.1, font12size + 2, "white");
         
         // high score
         // TODO: add method for incrementing score so this is not done here
         if (score > this.game.highscore)
         {
            this.game.highscore = score;
         }
         sscore = this.game.highscore.toString();
         // pad with zeros
         for (var i=0, j=8-sscore.length; i<j; i++)
         {
            sscore = "0" + sscore;
         }
         Game.fillText(ctx, "HI: " + sscore, font12pt, width * 0.4 + width * 0.1, font12size + 2, "white");
         
         // score multiplier indicator
         Game.fillText(ctx, "x" + this.game.scoreMultiplier, font12pt, width * 0.7 + width * 0.1, font12size + 2, "white");
         
         // time per wave indicator
         var wave = this.waves[this.currentWave],
             now = Date.now();
         var time = ~~((now - this.timeInScene) / 1000) + "/" + wave.lifetime;
         Game.fillText(ctx, time.toString(), font12pt, width * 0.8 + width * 0.1, font12size + 2, "white");
         
         // lives indicator graphics
         /*ctx.strokeStyle = "white";
         var s = ~~(6 * w.scale * 2);
         for (var i=0; i<this.game.lives; i++)
         {
            ctx.save();
            ctx.translate(width * 0.8 + (i*s*2), s + 2);
            ctx.beginPath();
            ctx.moveTo(-s*0.75, s);
            ctx.lineTo(s*0.75, s);
            ctx.lineTo(0, -s);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
         }*/
         
         // debug output
         if (DEBUG && DEBUG.FPS)
         {
            Game.fillText(ctx, "TPF: " + GameHandler.frametime, Game.fontFamily(w, 10), 0, height - Game.fontSize(w, 10) - 2, "lightblue");
            Game.fillText(ctx, "FPS: " + GameHandler.maxfps, Game.fontFamily(w, 10), 0, height - 2, "lightblue");
         }
         
         ctx.restore();
      },
      
      screenCenterVector: function screenCenterVector()
      {
         // transform to world position - to get the center of the game screen
         var m = new Vector(GameHandler.width*0.5, GameHandler.height*0.5);
         m.scale(1 / this.world.scale);
         m.x += this.world.viewx;
         m.y += this.world.viewy;
         return m;
      }
   });
})();


/**
 * Starfield star class.
 * 
 * @namespace Arena
 * @class Arena.Star
 */
(function()
{
   Arena.Star = function()
   {
      return this;
   };
   
   Arena.Star.prototype =
   {
      MAXZ: 15.0,
      VELOCITY: 0.1,
      
      x: 0,
      y: 0,
      z: 0,
      px: 0,
      py: 0,
      cycle: 0,
      
      init: function init()
      {
         // select a random point for the initial location
         this.x = (Rnd() * GameHandler.width - (GameHandler.width * 0.5)) * this.MAXZ;
         this.y = (Rnd() * GameHandler.height - (GameHandler.height * 0.5)) * this.MAXZ;
         this.z = this.MAXZ;
         this.px = 0;
         this.py = 0;
      },
      
      updateAndRender: function updateAndRender(i, ctx)
      {
         var xx = this.x / this.z,           // star position
             yy = this.y / this.z,
             e = (1.0 / this.z + 1)*2,       // size i.e. z
             // hsl colour from a sine wave
             hsl = "hsl(" + ((this.cycle * i) % 360) + ",90%,75%)";
             cx = (GameHandler.width * 0.5), cy = (GameHandler.height * 0.5);
         
         if (this.px != 0)
         {
            ctx.strokeStyle = hsl;
            ctx.lineWidth = e;
            ctx.beginPath();
            ctx.moveTo(xx + cx, yy + cy);
            ctx.lineTo(this.px + cx, this.py + cy);
            ctx.closePath();
            ctx.stroke();
         }
         
         // update star position values with new settings
         this.px = xx;
         this.py = yy;
         this.z -= this.VELOCITY;
         
         // reset when star is out of the view field
         if (this.z < this.VELOCITY || this.px > GameHandler.width || this.py > GameHandler.height)
         {
            // reset star
            this.init();
         }
         
         // colour cycle sinewave rotation
         this.cycle += 0.05;
      }
   };
})();
