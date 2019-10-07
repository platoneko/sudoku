cc.Class({
    extends: cc.Component,

    properties: {
        continueWindow: cc.Node,

        bgm: {
            type:cc.AudioClip,
            default:null,
        },
    },

    onLoad: function () {
        cc.audioEngine.play(this.bgm, true, 1);

        if (!window.Global.inited) {
            cc.loader.loadResDir("data", cc.JsonAsset, function (err, assets) {
                for (var i = assets.length - 1; i >= 0; i--) {
                    var d = assets[i].json;
                    window.Global.puzzles[d.level] = d.data;
                }
            });
            this.loadSavedGame();
            for (var j = 0; j < window.Global.puzzles.length; j++) {
                for (var k = 0; k < window.Global.passedLevels.length; k++) {
                    window.Global.puzzles[j].splice(window.Global.passedLevels[j][k], 1);
                }
            }
            this.askIfContinue();
            window.Global.inited = true;
        }
    },

    loadSavedGame: function () {
        //cc.sys.localStorage.clear();
        var savedGame = JSON.parse(cc.sys.localStorage.getItem("sudoku"));
        if (savedGame==null)
            return;
        window.Global.currentPuzzleId = savedGame.currentPuzzleId;
        window.Global.currentLevel = savedGame.currentLevel;
        window.Global.passedLevels = savedGame.passedLevels;
        window.Global.filledNumbers = savedGame.filledNumbers;
        window.Global.filledCandidates = savedGame.filledCandidates;
        window.Global.mute = savedGame.mute;

        cc.log("loaded");
    },

    askIfContinue: function () {
        if (window.Global.currentPuzzleId >= 0) {
            this.continueWindow.active = true;
        }
    },

    continueSavedGame: function () {
        cc.director.loadScene("Level");
    },

    closeContinueWindow: function () {
        this.continueWindow.active = false;
    },

    onPlayButtonTouched: function (customEventData) {
        window.Global.filledNumbers = [];
        window.Global.filledCandidates = [];
        window.Global.currentPuzzleId = -1;
        window.Global.currentLevel = customEventData;
        cc.director.loadScene("Level");
    }
});