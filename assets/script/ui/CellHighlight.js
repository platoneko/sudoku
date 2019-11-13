cc.Class({
    extends: cc.Component,
//高亮单元格脚本，被制成CellHighlight prefab,在HintBar.js中被调用
    properties: {
        txt: cc.Label,//没用的东西
        candidates: cc.Node,//单元格内1~9个候选数的集合节点
        candidatesLabels: [cc.Label]//创建cocos lable组件数组，放candidates母节点的1~9号小数字子节点
                                    //每个子节点都在引擎中被排好了位置
    },

/*              HintBar.js中的调用实例
highlight.getComponent("CellHighlight").
    showCandidates(this.currentPuzzle[this.currentHint.result.cell].candidates, 
                  [this.currentHint.result.val], 
                  cc.Color.GREEN);
*/
    showCandidates: function (haveCandidates, highlightCandidates, color) {//所有的候选数，需要高亮的候选数，高亮的颜色
        for (var i = 0; i < highlightCandidates.length; i++) {//遍历所有需要高亮的候选数
            if (highlightCandidates[i] != null) {//遍历到的当前候选数存在，往下执行

                if (haveCandidates.indexOf(parseInt(highlightCandidates[i]))>=0) {
                    this.candidatesLabels[highlightCandidates[i] - 1].string = highlightCandidates[i];
                    //将当前提示的数字赋给string，以便在hintpanel的文字提示中输出
                    this.candidatesLabels[highlightCandidates[i] - 1].node.color = color;
                    //将当前提示的数字(子node)染色
                }
            }
        }
    }
});

