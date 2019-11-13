cc.Class({
    extends: cc.Component,

    properties: {
        grid: cc.Node,//棋盘
        CellHighlight: {default: null, type: cc.Prefab},//高亮格子
        BoxHighlight: {default: null, type: cc.Prefab},//高亮的九宫格
        RowHighlight: {default: null, type: cc.Prefab},//高亮的排
        ColHighlight: {default: null, type: cc.Prefab},//高亮的列

        bar: cc.Node,
        title: cc.Label,
        hint: cc.RichText,
        buttons: cc.RichText,

        currentHint: null,//当前提示
        currentRequest: null,//当前请求提示的类型
        currentStep: {default: 0, serializable: false, visible: false},//提示的步骤
        currentPuzzle: [],
        highlights: []
    },

    //显示提示
    showHint: function (p, o) {
        this.currentPuzzle = p;
        this.currentHint = o;
        this.currentStep = 0;
        this.show(0);
        this.node.active = true;
    },

    //清除高亮
    clearHighlights: function () {
        while (this.highlights.length > 0) {
            var highlight = this.highlights.pop();
            this.grid.removeChild(highlight);
            highlight.destroy();
        }
    },

    //选取需要高亮的元素（排、列、九宫格）
    getHouseHighlight: function (house, index) {
        var houseHighlight = null;
        if (house == "排") {
            houseHighlight = cc.instantiate(this.RowHighlight);
            houseHighlight.x = 0;
            houseHighlight.y = (4 - index) * 55;
        }
        if (house == "列") {
            houseHighlight = cc.instantiate(this.ColHighlight);
            houseHighlight.x = (index - 4) * 55;
            houseHighlight.y = 0;
        }
        else if (house == "九宫格") {
            houseHighlight = cc.instantiate(this.BoxHighlight);
            houseHighlight.x = (parseInt(index % 3) - 1) * 165;
            houseHighlight.y = (1 - parseInt(index / 3)) * 165;
        }
        return houseHighlight;
    },

    //取得要高亮的格子
    getCellHighlight: function (index) {
        var cellHighlight = cc.instantiate(this.CellHighlight);
        cellHighlight.x = (parseInt(index % 9) - 4) * 55;
        cellHighlight.y = (4 - parseInt(index / 9)) * 55;
        return cellHighlight
    },

    //返回提示信息中包含的数字（提示数字多余两个的情况）
    getNumbersString: function (numbers, color) {
        var s = "";
        for (var i = 0; i < numbers.length; i++) {
            if (i > 0)
                s += "、";
            s += ("<color=" + color + ">" + numbers[i] + "</c>");
        }
        return s;
    },

    show: function (i) {
        this.title.string = "提示板";
        var highlight;
        switch (this.currentHint.cause) {
            case "Open Singles":
                //house：行 还是 列 还是 宫；index：哪一行列宫；cell：总的格子id号；val：数值
                switch (i) {
                    case 0:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "观察高亮的这一" + this.currentHint.result.house + "</c>";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 1:
                        highlight = this.getCellHighlight(this.currentHint.result.cell);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "高亮格子是这" +this.currentHint.result.house + "中唯一的空格子";
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 2:
                        this.hint.string = "所以该格子中的数字一定是9个数字中唯一剩下的" + this.currentHint.result.val;
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>填数</c>";
                        break;
                }
                break;//Open Singles

            case "Single Candidate":
                //cell：总的格子id号；val：数值
                switch (i) {
                    case 0:
                        highlight = this.getCellHighlight(this.currentHint.result.cell);
                        highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.cell].candidates, this.currentPuzzle[this.currentHint.result.cell].candidates, cc.Color.GREEN);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "<color=#00aa00>" + this.currentHint.result.val + "</c> 是高亮格子中唯一的候选数字";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 1:
                        this.hint.string = "所以该格子中的数字一定" + this.currentHint.result.val;
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>填数</c>";
                        break;
                }
                break;//Single Candidate

            case "Visual Elimination":
                //house：行 还是 列 还是 宫；index：哪一行列宫；cell：总的格子id号；val：数值
                switch (i) {
                    case 0:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "观察高亮这一" + this.currentHint.result.house + "</c>";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 1:
                        highlight = this.getCellHighlight(this.currentHint.result.cell);
                        highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.cell].candidates, [this.currentHint.result.val], cc.Color.GREEN);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "<color=#00aa00>" + this.currentHint.result.val + "</c>只出现在高亮的格子中";
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 2:
                        this.hint.string = "所以该格子中的数字一定是" + this.currentHint.result.val;
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>填数</c>";
                        break;
                }
                break;//Visual Elimination

            case "Naked Pair":
            case "Naked Triplet":
            case "Naked Quad":
                //return {house:houseString, index:j, updateCells:result.updateCells, becauseCells:result.becauseCells, becauseCandidates:result.becauseCandidates};
                switch (i) {
                    case 0:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "观察高亮这一" + this.currentHint.result.house + "</c>";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 1:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        for (var i1 = 0; i1 < this.currentHint.result.becauseCells.length; i1++) {
                            highlight = this.getCellHighlight(this.currentHint.result.becauseCells[i1]);
                            highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.becauseCells[i1]].candidates, this.currentHint.result.becauseCandidates, cc.Color.GREEN);
                            this.grid.addChild(highlight);
                            this.highlights.push(highlight);
                        }
                        this.hint.string = "高亮格子里的数字完全相同，为" + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00");
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 2:
                        this.hint.string = "所以" + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00") + "一定分别填在高亮的格子中";
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 3:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        for (var i2 = 0; i2 < this.currentHint.result.updateCells.length; i2++) {
                            highlight = this.getCellHighlight(this.currentHint.result.updateCells[i2]);
                            highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.updateCells[i2]].candidates, this.currentHint.result.removeCandidates, cc.Color.RED);
                            this.grid.addChild(highlight);
                            this.highlights.push(highlight);
                        }
                        this.hint.string = "因此可以确定," + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00")+ "不会出现在当前高亮的格子中";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>确认</c>";
                        break;
                }
                break;//Naked Pair, Naked Triplet, Naked Quad


            case "Pointing Elimination":
                //return {house:houseString, index:j, updateCells:uniqueArray(cellsUpdated),becauseCells:cellsWithCandidate,becauseCandidates:[digit]};
                switch (i) {
                    case 0:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "观察高亮这一" + this.currentHint.result.house + "</c>";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 1:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        for (var i3 = 0; i3 < this.currentHint.result.becauseCells.length; i3++) {
                            highlight = this.getCellHighlight(this.currentHint.result.becauseCells[i3]);
                            highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.becauseCells[i3]].candidates, this.currentHint.result.becauseCandidates, cc.Color.GREEN);
                            this.grid.addChild(highlight);
                            this.highlights.push(highlight);
                        }
                        this.hint.string = this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00") + "只出现在这些高亮的格子里";
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 2:
                        this.hint.string = "所以" + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00") + "一定会在高亮的某个格子里出现";
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 3:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.altHouse, this.currentHint.result.altIndex);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        for (var i2 = 0; i2 < this.currentHint.result.updateCells.length; i2++) {
                            highlight = this.getCellHighlight(this.currentHint.result.updateCells[i2]);
                            highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.updateCells[i2]].candidates, this.currentHint.result.removeCandidates, cc.Color.RED);
                            this.grid.addChild(highlight);
                            this.highlights.push(highlight);
                        }
                        this.hint.string = "因此可以确定，" + this.getNumbersString(this.currentHint.result.removeCandidates, "#cc0000") + "不会出现在当前"+this.currentHint.result.altHouse+"高亮的格子中";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>确认</c>";
                        break;
                }
                break;//Pointing Elimination

            case "Hidden Pair":
            case "Hidden Triplet":
            case "Hidden Quad":
                //return {house:houseString, index:j, updateCells:result.updateCells, becauseCells:result.becauseCells, becauseCandidates:result.becauseCandidates};
                switch (i) {
                    case 0:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        this.hint.string = "观察高亮这一"+ this.currentHint.result.house + "</c>";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 1:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        for (var i1 = 0; i1 < this.currentHint.result.becauseCells.length; i1++) {
                            highlight = this.getCellHighlight(this.currentHint.result.becauseCells[i1]);
                            highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.becauseCells[i1]].candidates, this.currentHint.result.becauseCandidates, cc.Color.GREEN);
                            this.grid.addChild(highlight);
                            this.highlights.push(highlight);
                        }
                        this.hint.string = "高亮格子里的数字完全相同，为" + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00");
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 2:
                        this.hint.string = "所以" + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00") + "一定分别填在高亮的格子中";
                        this.buttons.string = "<color=#006600 click='onHintPrevious'>上一步</c>     <color=#0000ff click='onHintNext'>下一步</c>";
                        break;
                    case 3:
                        this.clearHighlights();
                        highlight = this.getHouseHighlight(this.currentHint.result.house, this.currentHint.result.index);
                        this.grid.addChild(highlight);
                        this.highlights.push(highlight);
                        for (var i2 = 0; i2 < this.currentHint.result.updateCells.length; i2++) {
                            highlight = this.getCellHighlight(this.currentHint.result.updateCells[i2]);
                            highlight.getComponent("CellHighlight").showCandidates(this.currentPuzzle[this.currentHint.result.updateCells[i2]].candidates, this.currentHint.result.removeCandidates, cc.Color.RED);
                            this.grid.addChild(highlight);
                            this.highlights.push(highlight);
                        }
                        this.hint.string = "因此可以确定," + this.getNumbersString(this.currentHint.result.becauseCandidates, "#00aa00")+ "不会出现在当前高亮的格子中";
                        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>确认</c>";
                        break;
                }
                break;//Hidden Pair, Hidden Triplet, Hidden Quad
        }
    },

    hintNext: function () {
        if (this.currentHint) {
            this.currentStep++;
            this.show(this.currentStep);
        }
    },

    hintPrevious: function () {
        if (this.currentHint) {
            this.currentStep--;
            this.show(this.currentStep);
        }
    },

    hintApply: function () {
        this.hideHint();
    },

    hideHint: function () {
        this.clearHighlights();
        this.currentHint = null;
        this.currentRequest = null;
        this.currentStep = 0;
        this.node.active = false;
    },

    requestShowCandidates:function () {
        this.currentRequest = "Need Candidates";
        this.title.string = "提示板";
        this.hint.string = "需要显示每个格子的候选数字？";
        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>显示</c>";
        this.node.active = true;
    },

    requestFixWrongCells:function () {
        this.currentRequest = "Fix Cells";
        this.title.string = "提示板";
        this.hint.string = "需要修改错误的格子？";
        this.buttons.string = "<color=#006600 click='onHintCancel'>取消</c>     <color=#0000ff click='onHintApply'>修改</c>";
        this.node.active = true;
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
