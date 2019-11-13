cc.Class({
    extends: cc.Component,
//在Level.js中被调用
    properties: {
        effect: cc.Node,
        txt: cc.Label,
        candidates: cc.Node,
        candidatesShown: [],
        candidatesLabels: [cc.Label]
    },

    syncCandidates: function () {//在Level.js中被调用，用来格式化单元格内的候选数
        for (var i = 0; i < this.candidatesLabels.length; i++) {//遍历所有候选数
            if (this.candidatesShown[i]==null || this.candidatesShown[i]==undefined) {//如果当前候选数为空或者未定义
                this.candidatesLabels[i].string = " ";//统一将当前候选数字字符值置为空格
            }
            else {//否则将当前候选数字的数值转化为字符串并赋值
                this.candidatesLabels[i].string = this.candidatesShown[i].toString();
            }
        }
    },

    showUpdateEffect: function () {//跟新显示效果
        this.effect.opacity = 255;//完全不透明
        var a = cc.fadeOut(1);//变至完全透明，持续时间1秒
        this.effect.runAction(a);//执行效果
    },

    // use this for initialization
    onLoad: function () {

    },

    clean:function () {//清除函数，用来消去单元格内的候选数
        this.candidatesShown = [];//重新置空
        for (var i = 0; i < this.candidatesLabels.length; i++) {
            this.candidatesLabels[i].string = " ";//遍历，将候选数的数字改为空格
        }
        this.txt = "";//重新置空
    }


});