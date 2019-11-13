//全局变量脚本文件，供直接访问已在一个地方保存了节点或组件的引用
window.Global = {
    inited:false,//在start.js里边判断，是否需要初始化，一旦初始化后修改值为true
    currentLevel: "easy",//初始化难度为 简单
    puzzles: {easy: [], medium: [], hard: [], extreme: []},//定义puzzels字典，元素是四种难度的数组，存各个难度的puzzleid(在Level.js和Start.js里用到)
    currentPuzzleId: -1,//在Level.js和Start.js里用到，用于保存和重载某一棋局，默认初始值为-1
    passedLevels: {easy: [], medium: [], hard: [], extreme: []},//已经完成的难度，存各个难度的puzzleid(在Level.js和Start.js里用到)
    filledNumbers:[],//已经填好的格子
    filledCandidates:[],//已经填好的候选数字(草稿功能)
    currentPuzzle: null,//该全局变量只在HintBar.js中用到，这里声明了但没指定类型，在HintBar.js中定义为数组
    //currentAnswer: null,
    //seenLevels: {easy: [], medium: [], hard: [], extreme: []},
    mute: false//没用的东西
};
