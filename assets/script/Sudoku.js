'use strict';
/*TODO:
 --possible additions--
 toggle edit candidates
 undo/redo
 */

var DIFFICULTY_EASY = "easy";
var DIFFICULTY_MEDIUM = "medium";
var DIFFICULTY_HARD = "hard";
var DIFFICULTY_VERY_HARD = "extreme";

var SOLVE_MODE_STEP = "step";
var SOLVE_MODE_ALL = "all";

var DIFFICULTIES = [
    DIFFICULTY_EASY,
    DIFFICULTY_MEDIUM,
    DIFFICULTY_HARD,
    DIFFICULTY_VERY_HARD
];

/*
 * variables
 *-----------*/
var opts = opts || {};
var solveMode = SOLVE_MODE_STEP,
    difficulty = "easy",
    candidatesShowing = false,
    editingCandidates = false,
    boardFinished = false,
    boardError = false,
    onlyUpdatedCandidates = false,
    gradingMode = false, //solving without updating UI
    generatingMode = false, //silence board unsolvable errors
    invalidCandidates = [], //used by the generateBoard function


    /*
     the score reflects how much increased difficulty the board gets by having the pattern rather than an already solved cell
     */
    strategies = [
        {title: "Open Singles", fn: openSingles, score: 0.1},
        //harder for human to spot
        {title: "Single Candidate", fn: singleCandidate, score: 9},
        {title: "Visual Elimination", fn: visualElimination, score: 8},
        //only eliminates one candidate, should have lower score?
        {title: "Naked Pair", fn: nakedPair, score: 50},
        {title: "Pointing Elimination", fn: pointingElimination, score: 80},
        //harder for human to spot
        {title: "Hidden Pair", fn: hiddenPair, score: 90},
        {title: "Naked Triplet", fn: nakedTriplet, score: 100},
        //never gets used unless above strats are turned off?
        {title: "Hidden Triplet", fn: hiddenTriplet, score: 140},
        //never gets used unless above strats are turned off?
        {title: "Naked Quad", fn: nakedQuad, score: 150},
        //never gets used unless above strats are turned off?
        {title: "Hidden Quad", fn: hiddenQuad, score: 280}
    ],


    //nr of times each strategy has been used for solving this board - used to calculate difficulty score
    usedStrategies = [],

    /*board variable gets enhanced into list of objects on init:
     ,{
     val: null
     ,candidates: [
     ]
     }
     */
    board = [],
    boardSize,
    boardNumbers, // array of 1-9 by default, generated in initBoard

    //indexes of cells in each house - generated on the fly based on boardSize
    houses = [
        //hor. rows
        [],
        //vert. rows
        [],
        //cells
        []
    ];


/*
 * methods
 *-----------*/
//shortcut for logging..
function log(msg) {
    cc.log(msg);
}


//array contains function
function contains(a, obj) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}

function uniqueArray(a) {
    var temp = {};
    for (var i = 0; i < a.length; i++)
        temp[a[i]] = true;
    var r = [];
    for (var k in temp)
        r.push(k);
    return r;
}


/* calcBoardDifficulty
 * --------------
 *  TYPE: solely based on strategies required to solve board (i.e. single count per strategy)
 *  SCORE: distinguish between boards of same difficulty.. based on point system. Needs work.
 * -----------------------------------------------------------------*/
function calcBoardDifficulty(usedStrategies) {
    var boardDiff = {};
    if (usedStrategies.length < 3)
        boardDiff.level = DIFFICULTY_EASY;
    else if (usedStrategies.length < 4)
        boardDiff.level = DIFFICULTY_MEDIUM;
    else
        boardDiff.level = DIFFICULTY_HARD;

    var totalScore = 0;
    for (var i = 0; i < strategies.length; i++) {
        var freq = usedStrategies[i];
        if (!freq)
            continue; //undefined or 0, won't effect score
        var stratObj = strategies[i];
        totalScore += freq * stratObj.score;
    }
    boardDiff.score = totalScore;
    //log("totalScore: "+totalScore);

    if (totalScore > 750)
    // if(totalScore > 2200)
        boardDiff.level = DIFFICULTY_VERY_HARD;

    return boardDiff;
}


/* isBoardFinished
 * -----------------------------------------------------------------*/
function isBoardFinished() {
    for (var i = 0; i < boardSize * boardSize; i++) {
        if (board[i].val === null)
            return false;
    }
    return true;
}


/* generateHouseIndexList
 * -----------------------------------------------------------------*/
function generateHouseIndexList() {
    // reset houses
    houses = [
        //hor. rows
        [],
        //vert. rows
        [],
        //cells
        []
    ];
    var boxSideSize = Math.sqrt(boardSize);

    for (var i = 0; i < boardSize; i++) {
        var hrow = []; //horisontal row
        var vrow = []; //vertical row
        var box = [];
        for (var j = 0; j < boardSize; j++) {
            hrow.push(boardSize * i + j);
            vrow.push(boardSize * j + i);

            if (j < boxSideSize) {
                for (var k = 0; k < boxSideSize; k++) {
                    //0, 0,0, 27, 27,27, 54, 54, 54 for a standard sudoku
                    var a = Math.floor(i / boxSideSize) * boardSize * boxSideSize;
                    //[0-2] for a standard sudoku
                    var b = (i % boxSideSize) * boxSideSize;
                    var boxStartIndex = a + b; //0 3 6 27 30 33 54 57 60

                    //every boxSideSize box, skip boardSize num rows to next box (on new horizontal row)
                    //Math.floor(i/boxSideSize)*boardSize*2
                    //skip across horizontally to next box
                    //+ i*boxSideSize;


                    box.push(boxStartIndex + boardSize * j + k);
                }
            }
        }
        houses[0].push(hrow);
        // cc.log("houses0: " + hrow);
        houses[1].push(vrow);
        // cc.log("houses1: " + vrow);
        houses[2].push(box);
        // cc.log("houses2: " + box);
    }
}


/* initBoard
 * --------------
 *  inits board, variables.
 * -----------------------------------------------------------------*/
function initBoard(opts) {
    var alreadyEnhanced = (board[0] !== null && typeof board[0] === "object");
    var nullCandidateList = [];
    boardNumbers = [];
    boardSize = (!board.length && opts.boardSize) || Math.sqrt(board.length) || 9;
    // cc.log(boardSize);

    if (boardSize % 1 !== 0 || Math.sqrt(boardSize) % 1 !== 0) {
        log("invalid boardSize: " + boardSize);
        if (typeof opts.boardErrorFn === "function")
            opts.boardErrorFn({msg: "invalid board size"});
        return;
    }
    for (var i = 0; i < boardSize; i++) {
        boardNumbers.push(i + 1);
        nullCandidateList.push(null);
    }
    generateHouseIndexList();

    if (!alreadyEnhanced) {
        //enhance board to handle candidates, and possibly other params
        for (var j = 0; j < boardSize * boardSize; j++) {
            var cellVal = (typeof board[j] === "undefined") ? null : board[j];
            var candidates = cellVal === null ? boardNumbers.slice() : nullCandidateList.slice();
            board[j] = {
                val: cellVal,
                candidates: candidates
                //title: "" possibl add in 'A1. B1...etc
            };
        }
    }
}


/* renderBoard
 * --------------
 *  dynamically renders the board on the screen (into the DOM), based on board variable
 * -----------------------------------------------------------------*/
function renderBoard() {
    
}

/* renderBoardCell
 * -----------------------------------------------------------------*/
function renderBoardCell(boardCell, id) {

}


/* buildCandidatesString
 * -----------------------------------------------------------------*/



/* updateUI
 * --------------
 *  updates the UI
 * -----------------------------------------------------------------
 var updateUI = function(opts){
 var opts = opts || {};
 var paintNew = (typeof opts.paintNew !== "undefined") ? opts.paintNew : true;
 updateUIBoard(paintNew);
 }*/

/* updateUIBoard -
 * --------------
 *  updates the board with our latest values
 * -----------------------------------------------------------------*/
function updateUIBoard(paintNew) {
 
}


/* updateUIBoardCell -
 * --------------
 *  updates ONE cell on the board with our latest values
 * -----------------------------------------------------------------*/
function updateUIBoardCell(cellIndex, opts) {

}

/* uIBoardHighlightRemoveCandidate
 * --------------
 *  highlight candidate in cell that is about to be removed
 * -----------------------------------------------------------------*/
function uIBoardHighlightRemoveCandidate(cellIndex, digit) {
    // $("#input-"+cellIndex+"-candidates div:nth-of-type("+digit+")").addClass("candidate--to-remove");
}

/* uIBoardHighlightCandidate -
 * --------------
 *  highight candidate in cell that helps eliminate another candidate
 * -----------------------------------------------------------------*/
function uIBoardHighlightCandidate(cellIndex, digit) {
    // $("#input-"+cellIndex+"-candidates div:nth-of-type("+digit+")").addClass("candidate--highlight");
}


/* removeCandidatesFromCell
 -----------------------------------------------------------------*/
function removeCandidatesFromCell(cell, candidates) {
    var boardCell = board[cell];
    var c = boardCell.candidates;
    var cellUpdated = false;
    for (var i = 0; i < candidates.length; i++) {
        //-1 because candidate '1' is at index 0 etc.
        if (c[candidates[i] - 1] !== null) {
            c[candidates[i] - 1] = null; //writes to board variable
            cellUpdated = true;
        }
    }
    if (cellUpdated && solveMode === SOLVE_MODE_STEP)
        updateUIBoardCell(cell, {mode: "only-candidates"});
}


/* removeCandidatesFromCells
 * ---returns list of cells where any candidats where removed
 -----------------------------------------------------------------*/
function removeCandidatesFromCells(cells, candidates, dontRemove) {
    //log("removeCandidatesFromCells");
    var cellsUpdated = [];
    for (var i = 0; i < cells.length; i++) {
        var c = board[cells[i]].candidates;

        for (var j = 0; j < candidates.length; j++) {
            var candidate = candidates[j];
            //-1 because candidate '1' is at index 0 etc.
            if (c[candidate - 1] !== null) {
                if (!dontRemove)
                    c[candidate - 1] = null; //NOTE: also deletes them from board variable
                cellsUpdated.push(cells[i]); //will push same cell multiple times

                // if (solveMode === SOLVE_MODE_STEP) {
                //     //highlight candidate as to be removed on board
                //     uIBoardHighlightRemoveCandidate(cells[i], candidate);
                // }
            }
        }
    }
    return cellsUpdated;
}

function highLightCandidatesOnCells(candidates, cells) {
  
}


function resetBoardVariables() {
    boardFinished = false;
    boardError = false;
    onlyUpdatedCandidates = false;
    usedStrategies = [];
    gradingMode = false;
}


/* clearBoard
 -----------------------------------------------------------------*/
function clearBoard() {
    resetBoardVariables();

    if (!boardNumbers)
        return;

    //reset board variable
    var cands = boardNumbers.slice(0);
    for (var i = 0; i < boardSize * boardSize; i++) {
        board[i] = {
            val: null,
            candidates: cands.slice()
        };
    }

    //reset UI
    // _boardInputs
    // 	.removeClass("highlight-val")
    // 	.val("");

    updateUIBoard(false);
}

function getNullCandidatesList() {
    var l = [];
    for (var i = 0; i < boardSize; i++) {
        l.push(null);
    }
    return l;
}


/* resetCandidates
 -----------------------------------------------------------------*/
function resetCandidates(updateUI) {
    var resetCandidatesList = boardNumbers.slice(0);
    for (var i = 0; i < boardSize * boardSize; i++) {
        if (board[i].val === null) {
            board[i].candidates = resetCandidatesList.slice(); //otherwise same list (not reference!) on every cell
            // 	if(updateUI !== false)
            // 		$("#input-"+i+"-candidates").html(buildCandidatesString(resetCandidatesList));
            // } else if(updateUI !== false) {
            // 		$("#input-"+i+"-candidates").html("");
            // }
        }
    }
}

/* setBoardCell - does not update UI
 -----------------------------------------------------------------*/
function setBoardCell(cellIndex, val) {
    var boardCell = board[cellIndex];
    //update val
    boardCell.val = val;
    if (val !== null)
        boardCell.candidates = getNullCandidatesList();
}

/* indexInHouse
 * --------------
 *  returns index (0-9) for digit in house, false if not in house
 *  NOTE: careful evaluating returned index is IN row, as 0==false.
 * -----------------------------------------------------------------*/
function indexInHouse(digit, house) {
    for (var i = 0; i < boardSize; i++) {
        if (board[house[i]].val === digit)
            return i;
    }
    //not in house
    return false;
}


/* housesWithCell
 * --------------
 *  returns houses that a cell belongs to
 * -----------------------------------------------------------------*/
function housesWithCell(cellIndex) {
    var boxSideSize = Math.sqrt(boardSize);
    var houses = [];
    //horisontal row
    var hrow = Math.floor(cellIndex / boardSize);
    houses.push(hrow);
    //vertical row
    var vrow = Math.floor(cellIndex % boardSize);
    houses.push(vrow);
    //box
    var box = (Math.floor(hrow / boxSideSize) * boxSideSize) + Math.floor(vrow / boxSideSize);
    houses.push(box);

    return houses;
}

function checkConflict(cellIndex, cellVal) {
    var houseIndexes = housesWithCell(cellIndex);
    for (var ih in houses[2][houseIndexes[2]]) {
        if (board[houses[2][houseIndexes[2]][ih]].val == cellVal) {
            return houses[2][houseIndexes[2]][ih];
        }
    }
    for (var ir in houses[0][houseIndexes[0]]) {
        if (board[houses[0][houseIndexes[0]][ir]].val == cellVal) {
            return houses[0][houseIndexes[0]][ir];
        }
    }
    for (var ic in houses[1][houseIndexes[1]]) {
        if (board[houses[1][houseIndexes[1]][ic]].val == cellVal) {
            return houses[1][houseIndexes[1]][ic];
        }
    }
    return null;
}

function getHouses(cellIndex) {
    var houseIndexes = housesWithCell(cellIndex);
    return [houses[0][houseIndexes[0]], houses[1][houseIndexes[1]], houses[2][houseIndexes[2]]];
}

/* numbersLeft
 * --------------
 *  returns unused numbers in a house
 * -----------------------------------------------------------------*/
function numbersLeft(house) {
    var numbers = boardNumbers.slice();
    for (var i = 0; i < house.length; i++) {
        for (var j = 0; j < numbers.length; j++) {
            //remove all numbers that are already being used
            if (numbers[j] === board[house[i]].val)
                numbers.splice(j, 1);
        }
    }
    //return remaining numbers
    return numbers;
}


/* numbersTaken
 * --------------
 *  returns used numbers in a house
 * -----------------------------------------------------------------*/
function numbersTaken(house) {
    var numbers = [];
    for (var i = 0; i < house.length; i++) {
        var n = board[house[i]].val;
        if (n !== null)
            numbers.push(n);
    }
    //return remaining numbers
    return numbers;
}


/* candidatesLeft
 * --------------
 *  returns list of candidates for cell (with null's removed)
 * -----------------------------------------------------------------*/
function candidatesLeft(cellIndex) {
    var t = [];
    var candidates = board[cellIndex].candidates;
    for (var i = 0; i < candidates.length; i++) {
        if (candidates[i] !== null)
            t.push(candidates[i]);
    }
    return t;
};


/* cellsForCandidate
 * --------------
 *  returns list of possible cells (cellIndex) for candidate (in a house)
 * -----------------------------------------------------------------*/
function cellsForCandidate(candidate, house) {
    var t = [];
    for (var i = 0; i < house.length; i++) {
        var cell = board[house[i]];
        var candidates = cell.candidates;
        if (contains(candidates, candidate))
            t.push(house[i]);
    }
    return t;
}


/* openSingles
 * --------------
 *  checks for houses with just one empty cell - fills it in board variable if so
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function openSingles() {
    //log("looking for openSingles");

    //for each type of house..(hor row / vert row / box)
    var hlength = houses.length;
    for (var i = 0; i < hlength; i++) {

        //for each such house
        var housesCompleted = 0; //if goes up to 9, sudoku is finished

        for (var j = 0; j < boardSize; j++) {
            var emptyCells = [];

            // for each cell..
            for (var k = 0; k < boardSize; k++) {

                var boardIndex = houses[i][j][k];
                if (board[boardIndex].val === null) {
                    emptyCells.push({house: houses[i][j], cell: boardIndex});
                    if (emptyCells.length > 1) {
                        //log("more than one empty cell, house area :["+i+"]["+j+"]");
                        break;
                    }
                }
            }
            //one empty cell found
            if (emptyCells.length === 1) {
                var emptyCell = emptyCells[0];
                //grab number to fill in in cell
                var val = numbersLeft(emptyCell.house);
                if (val.length > 1) {
                    // cc.log("openSingles found more than one answer for: "+emptyCell.cell+" .. board incorrect!");
                    // cc.log(val);
                    boardError = true; //to force solve all loop to stop
                    return -1; //error
                }

                //log("fill in single empty cell " + emptyCell.cell+", val: "+val);

                if (opts.needAnalyze)
                    setBoardCell(emptyCell.cell, val[0]); //does not update UI
                // if (solveMode === SOLVE_MODE_STEP)
                //     uIBoardHighlightCandidate(emptyCell.cell, val[0]);

                if (opts.needAnalyze)
                    return [emptyCell.cell];
                return {house: getHouseString(i), index: j, cell: emptyCell.cell, val: val[0]};
            }
            //no empty ells..
            if (emptyCells.length === 0) {
                housesCompleted++;
                //log(i+" "+j+": "+housesCompleted);
                if (housesCompleted === boardSize) {
                    boardFinished = true;
                    return -1; //special case, done
                }
            }
        }
    }
    return false;
}


/* visualEliminationOfCandidates
 * --------------
 * ALWAYS returns false
 * -- special compared to other strats: doesn't step - updates whole board,
 in one go. Since it also only updates candidates, we can skip straight to next strat, since we know that neither this one nor the one(s) before (that only look at actual numbers on board), will find anything new.
 * -----------------------------------------------------------------*/
function visualEliminationOfCandidates() {
    //for each type of house..(hor row / vert row / box)
    var hlength = houses.length;
    for (var i = 0; i < hlength; i++) {

        //for each such house
        for (var j = 0; j < boardSize; j++) {
            var house = houses[i][j];
            var candidatesToRemove = numbersTaken(house);
            //log(candidatesToRemove);

            // for each cell..
            for (var k = 0; k < boardSize; k++) {
                var cell = house[k];
                var candidates = board[cell].candidates;
                removeCandidatesFromCell(cell, candidatesToRemove);
            }
        }
    }
    return false;
}


/* visualElimination
 * --------------
 * Looks for houses where a digit only appears in one slot
 * -meaning we know the digit goes in that slot.
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function visualElimination() {
    //log("visualElimination");
    //for each type of house..(hor row / vert row / box)
    var hlength = houses.length;
    for (var i = 0; i < hlength; i++) {

        //for each such house
        for (var j = 0; j < boardSize; j++) {
            var house = houses[i][j];
            var digits = numbersLeft(house);

            //for each digit left for that house
            for (var k = 0; k < digits.length; k++) {
                var digit = digits[k];
                var possibleCells = [];

                //for each cell in house
                for (var l = 0; l < boardSize; l++) {
                    var cell = house[l];
                    var boardCell = board[cell];
                    //if the digit only appears as a candidate in one slot, that's where it has to go
                    if (contains(boardCell.candidates, digit)) {
                        possibleCells.push(cell);
                        if (possibleCells.length > 1)
                            break; //no we can't tell anything in this case
                    }
                }

                if (possibleCells.length === 1) {
                    var cellIndex = possibleCells[0];

                    //log("only slot where "+digit+" appears in house. ");

                    if (opts.needAnalyze)
                        setBoardCell(cellIndex, digit); //does not update UI
                    //
                    // if (solveMode === SOLVE_MODE_STEP)
                    //     uIBoardHighlightCandidate(cellIndex, digit);

                    onlyUpdatedCandidates = false;
                    if (opts.needAnalyze)
                        return [cellIndex]; //one step at the time

                    return {house: getHouseString(i), index: j, cell: cellIndex, val: digit};
                }
            }

        }
    }
    return false;
}


/* singleCandidate
 * --------------
 * Looks for cells with only one candidate
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function singleCandidate() {
    //before we start with candidate strategies, we need to update candidates from last round:
    if (opts.needAnalyze)
        visualEliminationOfCandidates(); //TODO: a bit hackyy, should probably not be here

    //for each cell

    for (var i = 0; i < board.length; i++) {
        var cell = board[i];
        var candidates = cell.candidates;

        //for each candidate for that cell
        var possibleCandidates = [];
        for (var j = 0; j < candidates.length; j++) {
            if (candidates[j] !== null)
                possibleCandidates.push(candidates[j]);
            if (possibleCandidates.length > 1)
                break; //can't find answer here
        }
        if (possibleCandidates.length === 1) {
            var digit = possibleCandidates[0];

            //log("only one candidate in cell: "+digit+" in house. ");

            if (opts.needAnalyze)
                setBoardCell(i, digit); //does not update UI
            // if (solveMode === SOLVE_MODE_STEP)
            //     uIBoardHighlightCandidate(i, digit);

            onlyUpdatedCandidates = false;
            if (opts.needAnalyze)
                return [i]; //one step at the time
            return {cell: i, val: digit};
        }
    }
    return false;
}


/* pointingElimination
 * --------------
 * if candidates of a type (digit) in a box only appar on one row, all other
 * same type candidates can be removed from that row
 ------------OR--------------
 * same as above, but row instead of box, and vice versa.
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function pointingElimination() {
    var effectedCells = false;

    //for each type of house..(hor row / vert row / box)
    var hlength = houses.length;
    for (var a = 0; a < hlength; a++) {
        var houseType = a;

        for (var i = 0; i < boardSize; i++) {
            var house = houses[houseType][i];

            //for each digit left for this house
            var digits = numbersLeft(house);
            for (var j = 0; j < digits.length; j++) {
                var digit = digits[j];
                //check if digit (candidate) only appears in one row (if checking cells),
                //, or only in one box (if checking rows)

                var sameAltHouse = true; //row if checking box, and vice versa
                var houseId = -1;
                //when point checking from box, need to compare both kind of rows
                //that box cells are also part of, so use houseTwoId as well
                var houseTwoId = -1;
                var sameAltTwoHouse = true;
                var cellsWithCandidate = [];
                //var cellDistance = null;

                //for each cell
                for (var k = 0; k < house.length; k++) {
                    var cell = house[k];

                    if (contains(board[cell].candidates, digit)) {
                        var cellHouses = housesWithCell(cell);
                        var newHouseId = (houseType === 2) ? cellHouses[0] : cellHouses[2];
                        var newHouseTwoId = (houseType === 2) ? cellHouses[1] : cellHouses[2];

                        //if(cellsWithCandidate.length > 0){ //why thice the same?


                        if (cellsWithCandidate.length > 0) {
                            if (newHouseId !== houseId) {
                                sameAltHouse = false;
                            }
                            if (houseTwoId !== newHouseTwoId) {
                                sameAltTwoHouse = false;
                            }
                            if (sameAltHouse === false && sameAltTwoHouse === false) {
                                break; //not in same altHouse (box/row)
                            }

                        }
                        //}
                        houseId = newHouseId;
                        houseTwoId = newHouseTwoId;
                        cellsWithCandidate.push(cell);
                    }
                }
                if ((sameAltHouse === true || sameAltTwoHouse === true ) && cellsWithCandidate.length > 0) {
                    //log("sameAltHouse..");
                    //we still need to check that this actually eliminates something, i.e. these possible cells can't be only in house

                    //first figure out what kind of house we are talking about..
                    var h = housesWithCell(cellsWithCandidate[0]);
                    var altHouseType = 2;
                    if (houseType === 2) {
                        if (sameAltHouse)
                            altHouseType = 0;
                        else
                            altHouseType = 1;
                    }


                    var altHouse = houses[altHouseType][h[altHouseType]];
                    var cellsEffected = [];

                    //log("houses["+houseType+"]["+h[houseType]+"].length: "+houses[houseType][h[houseType]].length);

                    //need to remove cellsWithCandidate - from cells to remove from
                    for (var x = 0; x < altHouse.length; x++) {
                        if (!contains(cellsWithCandidate, altHouse[x])) {
                            cellsEffected.push(altHouse[x]);
                        }
                    }
                    //log("houses["+houseType+"]["+h[houseType]+"].length: "+houses[houseType][h[houseType]].length);

                    //remove all candidates on altHouse, outside of house
                    var cellsUpdated = removeCandidatesFromCells(cellsEffected, [digit], !opts.needAnalyze);

                    if (cellsUpdated.length > 0) {
                        // log("pointing: digit "+digit+", from houseType: "+houseType);

                        if (solveMode === SOLVE_MODE_STEP)
                            highLightCandidatesOnCells([digit], cellsWithCandidate);


                        onlyUpdatedCandidates = true;

                        //return cellsUpdated.concat(cellsWithCandidate);
                        //only return cells where we actually update candidates
                        if (opts.needAnalyze)
                            return cellsUpdated;

                        return {
                            house: getHouseString(houseType),
                            altHouse: getHouseString(altHouseType),
                            index: i,
                            altIndex: h[altHouseType],
                            updateCells: uniqueArray(cellsUpdated),
                            becauseCells: cellsWithCandidate,
                            becauseCandidates: [digit],
                            removeCandidates: [digit]
                        };
                    }
                }
            }
        }
    }
    return false;
}

function getHouseString(houseType) {
    var houseString = "排";
    if (houseType == 1)
        houseString = "列";
    else if (houseType == 2)
        houseString = "九宫格";
    return houseString;
}


/* nakedCandidates
 * --------------
 * looks for n nr of cells in house, which together has exactly n unique candidates.
 this means these candidates will go into these cells, and can be removed elsewhere in house.
 *
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function nakedCandidates(n) {

    //for each type of house..(hor row / vert row / box)
    var hlength = houses.length;
    for (var i = 0; i < hlength; i++) {

        //for each such house
        for (var j = 0; j < boardSize; j++) {
            //log("["+i+"]"+"["+j+"]");
            var house = houses[i][j];
            if (numbersLeft(house).length <= n) //can't eliminate any candidates
                continue;
            var combineInfo = []; //{cell: x, candidates: []}, {} ..
            //combinedCandidates,cellsWithCandidate;
            var minIndexes = [-1];
            //log("--------------");
            //log("house: ["+i+"]["+j+"]");


            //checks every combo of n candidates in house, returns pattern, or false
            var result = checkCombinedCandidates(house, 0);
            if (result !== false) {
                if (opts.needAnalyze)
                    return result;

                // {updateCells:uniqueArray(cellsUpdated),becauseCells:cellsWithCandidates,becauseCandidates:combinedCandidates};
                return {
                    house: getHouseString(i),
                    index: j,
                    updateCells: result.updateCells,
                    becauseCells: result.becauseCells,
                    becauseCandidates: result.becauseCandidates,
                    removeCandidates: result.becauseCandidates
                };
            }

        }
    }
    return false; //pattern not found

    function checkCombinedCandidates(house, startIndex) {
        //log("startIndex: "+startIndex);
        for (var i = Math.max(startIndex, minIndexes[startIndex]); i < boardSize - n + startIndex; i++) {
            //log(i);

            //never check this cell again, in this loop
            minIndexes[startIndex] = i + 1;
            //or in a this loop deeper down in recursions
            minIndexes[startIndex + 1] = i + 1;

            //if(startIndex === 0){
            //	combinedCandidates = [];
            //	cellsWithCandidate = []; //reset
            //}
            var cell = house[i];
            var cellCandidates = candidatesLeft(cell);

            if (cellCandidates.length === 0 || cellCandidates.length > n)
                continue;


            //try adding this cell and it's cellCandidates,
            //but first need to check that that doesn't make (unique) amount of
            //candidates in combineInfo > n

            //if this is the first item we add, we don't need this check (above one is enough)
            if (combineInfo.length > 0) {
                var temp = cellCandidates.slice();
                for (var a = 0; a < combineInfo.length; a++) {
                    var candidates = combineInfo[a].candidates;
                    for (var b = 0; b < candidates.length; b++) {
                        if (!contains(temp, candidates[b]))
                            temp.push(candidates[b]);
                    }
                }
                if (temp.length > n) {
                    continue; //combined candidates spread over > n cells, won't work
                }

            }

            combineInfo.push({cell: cell, candidates: cellCandidates});


            if (startIndex < n - 1) {
                //still need to go deeper into combo
                var r = checkCombinedCandidates(house, startIndex + 1);
                //when we come back, check if that's because we found answer.
                //if so, return with it, otherwise, keep looking
                if (r !== false)
                    return r;
            }

            //check if we match our pattern
            //if we have managed to combine n-1 cells,
            //(we already know that combinedCandidates is > n)
            //then we found a match!
            if (combineInfo.length === n) {
                //now we need to check whether this eliminates any candidates


                //now we need to check whether this eliminates any candidates

                var cellsWithCandidates = [];
                var combinedCandidates = []; //not unique either..
                for (var x = 0; x < combineInfo.length; x++) {
                    cellsWithCandidates.push(combineInfo[x].cell);
                    combinedCandidates = combinedCandidates.concat(combineInfo[x].candidates);
                }


                //get all cells in house EXCEPT cellsWithCandidates
                var cellsEffected = [];
                for (var y = 0; y < boardSize; y++) {
                    if (!contains(cellsWithCandidates, house[y])) {
                        cellsEffected.push(house[y]);
                    }
                }

                //remove all candidates on house, except the on cells matched in pattern
                var cellsUpdated = removeCandidatesFromCells(cellsEffected, combinedCandidates, !opts.needAnalyze);

                //if it does remove candidates, we're succeded!
                if (cellsUpdated.length > 0) {
                    //log("nakedCandidates: ");
                    //log(combinedCandidates);

                    // if (solveMode === SOLVE_MODE_STEP)
                    //     highLightCandidatesOnCells(combinedCandidates, cellsWithCandidates);

                    onlyUpdatedCandidates = true;
                    // return cellsWithCandidates.concat(cellsUpdated);

                    //return cells we actually update, duplicates removed
                    if (opts.needAnalyze)
                        return uniqueArray(cellsUpdated);
                    var uniqueCombinedCandidates = uniqueArray(combinedCandidates);
                    return {
                        updateCells: uniqueArray(cellsUpdated),
                        becauseCells: cellsWithCandidates,
                        becauseCandidates: uniqueCombinedCandidates,
                        removeCandidates: uniqueCombinedCandidates
                    };
                }
            }
        }
        if (startIndex > 0) {
            //if we added a value to our combo check, but failed to find pattern, we now need drop that value and go back up in chain and continue to check..
            if (combineInfo.length > startIndex - 1) {
                //log("nakedCans: need to pop last added values..");
                combineInfo.pop();
            }
        }
        return false;
    }
}


/* nakedPair
 * --------------
 * see nakedCandidateElimination for explanation
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function nakedPair() {
    return nakedCandidates(2);
}

/* nakedTriplet
 * --------------
 * see nakedCandidateElimination for explanation
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function nakedTriplet() {
    return nakedCandidates(3);
}

/* nakedQuad
 * --------------
 * see nakedCandidateElimination for explanation
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function nakedQuad() {
    return nakedCandidates(4);
}


/* hiddenLockedCandidates
 * --------------
 * looks for n nr of cells in house, which together has exactly n unique candidates.
 this means these candidates will go into these cells, and can be removed elsewhere in house.
 *
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function hiddenLockedCandidates(n) {

    //for each type of house..(hor row / vert row / box)
    var hlength = houses.length;
    for (var i = 0; i < hlength; i++) {

        //for each such house
        for (var j = 0; j < boardSize; j++) {
            var house = houses[i][j];
            if (numbersLeft(house).length <= n) //can't eliminate any candidates
                continue;
            var combineInfo = []; //{candate: x, cellsWithCandidate: []}, {} ..
            //combinedCandidates,cellsWithCandidate;
            var minIndexes = [-1];
            //log("--------------");
            //log("house: ["+i+"]["+j+"]");

            //checks every combo of n candidates in house, returns pattern, or false
            var result = checkLockedCandidates(house, 0);
            if (result !== false) {
                if (opts.needAnalyze)
                    return result;

                return {
                    house: getHouseString(i),
                    index: j,
                    updateCells: result.updateCells,
                    becauseCells: result.becauseCells,
                    becauseCandidates: result.becauseCandidates,
                    removeCandidates: result.removeCandidates
                };
            }

        }
    }
    return false; //pattern not found


    function checkLockedCandidates(house, startIndex) {
        //log("startIndex: "+startIndex);
        for (var i = Math.max(startIndex, minIndexes[startIndex]); i <= boardSize - n + startIndex; i++) {

            //log(i);
            //never check this cell again, in this loop
            minIndexes[startIndex] = i + 1;
            //or in a this loop deeper down in recursions
            minIndexes[startIndex + 1] = i + 1;

            var candidate = i + 1;
            //log(candidate);


            var possibleCells = cellsForCandidate(candidate, house);

            if (possibleCells.length === 0 || possibleCells.length > n)
                continue;

            //try adding this candidate and it's possible cells,
            //but first need to check that that doesn't make (unique) amount of
            //possible cells in combineInfo > n
            if (combineInfo.length > 0) {
                var temp = possibleCells.slice();
                for (var a = 0; a < combineInfo.length; a++) {
                    var cells = combineInfo[a].cells;
                    for (var b = 0; b < cells.length; b++) {
                        if (!contains(temp, cells[b]))
                            temp.push(cells[b]);
                    }
                }
                if (temp.length > n) {
                    //log("combined candidates spread over > n cells");
                    continue; //combined candidates spread over > n cells, won't work
                }

            }

            combineInfo.push({candidate: candidate, cells: possibleCells});

            if (startIndex < n - 1) {
                //still need to go deeper into combo
                var r = checkLockedCandidates(house, startIndex + 1);
                //when we come back, check if that's because we found answer.
                //if so, return with it, otherwise, keep looking
                if (r !== false)
                    return r;
            }
            //check if we match our pattern
            //if we have managed to combine n-1 candidates,
            //(we already know that cellsWithCandidates is <= n)
            //then we found a match!
            if (combineInfo.length === n) {

                //now we need to check whether this eliminates any candidates

                var combinedCandidates = []; //not unique now...
                var cellsWithCandidates = []; //not unique either..
                for (var x = 0; x < combineInfo.length; x++) {
                    combinedCandidates.push(combineInfo[x].candidate);
                    cellsWithCandidates = cellsWithCandidates.concat(combineInfo[x].cells);
                }


                var candidatesToRemove = [];
                for (var c = 0; c < boardSize; c++) {
                    if (!contains(combinedCandidates, c + 1))
                        candidatesToRemove.push(c + 1);
                }
                //log("candidates to remove:")
                //log(candidatesToRemove);

                //remove all other candidates from cellsWithCandidates
                var cellsUpdated = removeCandidatesFromCells(cellsWithCandidates, candidatesToRemove, !opts.needAnalyze);

                //if it does remove candidates, we're succeded!
                if (cellsUpdated.length > 0) {
                    //log("hiddenLockedCandidates: ");
                    //log(combinedCandidates);

                    if (solveMode === SOLVE_MODE_STEP)
                        highLightCandidatesOnCells(combinedCandidates, cellsWithCandidates);

                    onlyUpdatedCandidates = true;

                    //filter out duplicates
                    if (opts.needAnalyze)
                        return uniqueArray(cellsWithCandidates);
                    return {
                        updateCells: uniqueArray(cellsUpdated),
                        becauseCells: uniqueArray(cellsWithCandidates),
                        becauseCandidates: uniqueArray(combinedCandidates),
                        removeCandidates: uniqueArray(candidatesToRemove)
                    };
                }
            }
        }
        if (startIndex > 0) {
            //if we added a value to our combo check, but failed to find pattern, we now need drop that value and go back up in chain and continu to check..
            if (combineInfo.length > startIndex - 1) {
                combineInfo.pop();
            }
        }
        return false;
    }
}


/* hiddenPair
 * --------------
 * see hiddenLockedCandidates for explanation
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function hiddenPair() {
    return hiddenLockedCandidates(2);
}


/* hiddenTriplet
 * --------------
 * see hiddenLockedCandidates for explanation
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function hiddenTriplet() {
    return hiddenLockedCandidates(3);
}

/* hiddenQuad
 * --------------
 * see hiddenLockedCandidates for explanation
 * -- returns effectedCells - the updated cell(s), or false
 * -----------------------------------------------------------------*/
function hiddenQuad() {
    return hiddenLockedCandidates(4);
}


/* solveFn
 * --------------
 *  applies strategy i (where i represents strategy, ordered by simplicity
 *  -if strategy fails (too advanced a sudoku) AND an more advanced strategy exists:
 *		calls itself with i++
 *  returns canContinue true|false - only relevant for solveMode "all"
 * -----------------------------------------------------------------*/
var nrSolveLoops = 0;
var gotResult = false;

var solveFn = function (i) {
    //log(i);
    if (boardFinished) {
        if (!gradingMode) {
            updateUIBoard(false);
            //log("finished!");
            //log("usedStrats:")
            //log(usedStrategies);

            //callback
            if (typeof opts.boardFinishedFn === "function") {
                opts.boardFinishedFn({
                    //difficultyInfo: calcBoardDifficulty(usedStrategies)
                });
            }
        }

        return false; //we're done!

    } 

    nrSolveLoops++;
    var strat = strategies[i].fn;
    //log("use strat nr:" +i);
    gotResult = strat();

    if (gotResult === false) {
        if (strategies.length > i + 1) {
            return solveFn(i + 1);
        } else {
            if (typeof opts.boardErrorFn === "function" && !generatingMode)
                opts.boardErrorFn({msg: "no more strategies"});

            if (!gradingMode && !generatingMode && solveMode === SOLVE_MODE_ALL)
                updateUIBoard(false);
            return false;
        }

    } else if (boardError) {
        if (typeof opts.boardErrorFn === "function")
            opts.boardErrorFn({msg: "Board incorrect"});

        // if (solveMode === SOLVE_MODE_ALL) {
        //     updateUIBoard(false); //show user current state of board... how much they need to reset for it to work again.
        // }

        return false; //we can't do no more solving

    } else if (solveMode === SOLVE_MODE_STEP) {
        // if user clicked solve step, and we're only going to fill in a new value (not messing with candidates) - then show user straight away
        //callback
        if (typeof opts.boardUpdatedFn === "function") {
            opts.boardUpdatedFn({cause: strategies[i].title, result: gotResult});
        }

        //check if this finished the board
        if (isBoardFinished()) {
            boardFinished = true;
            //callback
            if (typeof opts.boardFinishedFn === "function") {
                opts.boardFinishedFn({
                    difficultyInfo: calcBoardDifficulty(usedStrategies)
                });
            }
            //paint the last cell straight away
            if (candidatesShowing)
                updateUIBoard(false);
        }


        //if a new number was filled in, show this on board
        // if (!candidatesShowing && !onlyUpdatedCandidates &&
        //     effectedCells && effectedCells !== -1) {
        //remove highlights from last step
        // _boardInputs.removeClass("highlight-val");
        // $(".candidate--highlight").removeClass("candidate--highlight");
        //update board with new effected cell(s) info
        // for (var k = 0; k < effectedCells.length; k++) {
        //     updateUIBoardCell(effectedCells[k]);
        // }
        // }
    }

    //we got an answer, using strategy i
    if (typeof usedStrategies[i] === "undefined")
        usedStrategies[i] = 0;
    usedStrategies[i] = usedStrategies[i] + 1;
    //if we only updated candidates, make sure they're showing
    // if (!gradingMode && !candidatesShowing && onlyUpdatedCandidates) {// && i > 3){
    //     showCandidates();
    //if (!opts.needAnalyze && i>0)
    //callback in case UI has toggle btn, so it can be updated
    //if (typeof opts.candidateShowToggleFn === "function")
    //{
    //    opts.candidateShowToggleFn(true);
    //   return false;
    //}

    // }

    return true; // can continue
};




/* toggleCandidateOnCell - used for editingCandidates mode
 * -----------------------------------------------------------------*/
function toggleCandidateOnCell(candidate, cell) {
    var boardCell = board[cell];
    if (boardCell.val) {
        return;  // don't modify candidates when a cell already has a number
    }
    var c = boardCell.candidates;
    c[candidate - 1] = c[candidate - 1] === null ? candidate : null;
    if (solveMode === SOLVE_MODE_STEP)
        updateUIBoardCell(cell, {mode: "only-candidates"});
}

/* keyboardNumberInput - update our board model
 * -----------------------------------------------------------------*/
function keyboardNumberInput(input, id) {
    var val = parseInt(input.val());
    if (editingCandidates) {
        toggleCandidateOnCell(val, id);
        // reset value on board
        input.val(board[id].val);
        return;
    }

    //log(id+": "+val +" entered.");

    var candidates = getNullCandidatesList(); //[null,null....null];


    if (val > 0) { //invalidates Nan
        //check that this doesn't make board incorrect
        var temp = housesWithCell(id);
        //for each type of house
        for (var i = 0; i < houses.length; i++) {

            if (indexInHouse(val, houses[i][temp[i]])) {
                //digit already in house - board incorrect with user input
                // log("board incorrect!");
                var alreadyExistingCellInHouseWithDigit = houses[i][temp[i]][indexInHouse(val, houses[i][temp[i]])];

                //this happens in candidate mode, if we highlight on ui board before entering value, and user then enters before us.
                if (alreadyExistingCellInHouseWithDigit === id)
                    continue;

                // $("#input-" + alreadyExistingCellInHouseWithDigit + ", #input-"+id)
                // 	.addClass("board-cell--error");
                //make as incorrect in UI

                //input was incorrect, so don't update our board model
                return;
            }
        }

        //remove candidates..
        input.siblings(".candidates").html(buildCandidatesString(candidates));
        //update board
        board[id].candidates = candidates;
        board[id].val = val;

        //check if that finished board
        if (isBoardFinished()) {
            boardFinished = true;
            log("user finished board!");
            if (typeof opts.boardFinishedFn === "function") {
                opts.boardFinishedFn({
                    //we rate the board via what strategies was used to solve it
                    //we don't have this info if user solved it, unless we
                    //always analyze board on init.. but that could be slow.

                    difficultyInfo: null
                });
            }
        }
    } else {
        boardError = false; //reset, in case they fixed board - otherwise, we'll find the error again
        val = null;
        //add back candidates to UI cell
        candidates = boardNumbers.slice();
        input.siblings(".candidates").html(buildCandidatesString(candidates));

        //needs to happen before we resetCandidates below
        board[id].val = val;

        //update candidates (if we could reverse remove candidates from this cell and outwards, we wouldn't have to redo all board)
        resetCandidates();
        visualEliminationOfCandidates();
    }
    //log(board[1].candidates);

    //HACK: remove all errors as soon as they fix one - the other cells just get emptied on board (in UI; already were null in model)
    // if($("#input-"+id).hasClass("board-cell--error"))
    // 	_boardInputs.removeClass("board-cell--error");

    if (typeof opts.boardUpdatedFn === "function")
        opts.boardUpdatedFn({cause: "user input", cellsUpdated: [id]});

    onlyUpdatedCandidates = false;
}

/* toggleShowCandidates
 * -----------------------------------------------------------------*/
function toggleShowCandidates() {
    // _board.toggleClass("showCandidates");
    candidatesShowing = !candidatesShowing;
}

/* analyzeBoard
 * solves a copy of the current board(without updating the UI),
 * reports back: error|finished, usedStrategies and difficulty level and score
 * -----------------------------------------------------------------*/
function analyzeBoard() {
    gradingMode = true;
    solveMode = SOLVE_MODE_ALL;
    var usedStrategiesClone = JSON.parse(JSON.stringify(usedStrategies));
    var boardClone = JSON.parse(JSON.stringify(board));
    var canContinue = true;
    while (canContinue) {
        var startStrat = onlyUpdatedCandidates ? 2 : 0;
        canContinue = solveFn(startStrat);
    }
    var data = {};
    if (boardError) {
        data.error = "Board incorrect";
    }
    else {
        data.finished = boardFinished;
        data.usedStrategies = [];
        for (var i = 0; i < usedStrategies.length; i++) {
            var strat = strategies[i];
            //only return strategies that were actually used
            if (typeof usedStrategies[i] !== "undefined") {
                data.usedStrategies[i] = {
                    title: strat.title,
                    freq: usedStrategies[i]
                };
            }
        }

        if (boardFinished) {
            var boardDiff = calcBoardDifficulty(usedStrategies);
            data.level = boardDiff.level;
            data.score = boardDiff.score;
        }
    }

    //restore everything to state (before solving)
    resetBoardVariables();
    usedStrategies = usedStrategiesClone;
    board = boardClone;

    return data;
}


function setBoardCellWithRandomCandidate(cellIndex, forceUIUpdate) {
    // CHECK still valid
    visualEliminationOfCandidates();
    // DRAW RANDOM CANDIDATE
    // don't draw already invalidated candidates for cell
    var invalids = invalidCandidates && invalidCandidates[cellIndex];
    // TODO: don't use JS filter - not supported enough(?)
    var candidates = board[cellIndex].candidates.filter(function (candidate) {
        if (!candidate || (invalids && contains(invalids, candidate)))
            return false;
        return candidate;
    });
    // if cell has 0 candidates - fail to set cell.
    if (candidates.length === 0) {
        return false;
    }
    var randIndex = Math.round(Math.random() * (candidates.length - 1));
    var randomCandidate = candidates[randIndex];
    // UPDATE BOARD
    setBoardCell(cellIndex, randomCandidate);
    return true;
}

function generateBoardAnswerRecursively(cellIndex) {
    if ((cellIndex + 1) > (boardSize * boardSize)) {
        //done
        invalidCandidates = [];
        return true;
    }
    if (setBoardCellWithRandomCandidate(cellIndex)) {
        generateBoardAnswerRecursively(cellIndex + 1);
    } else {
        if (cellIndex <= 0)
            return false;
        var lastIndex = cellIndex - 1;
        invalidCandidates[lastIndex] = invalidCandidates[lastIndex] || [];
        invalidCandidates[lastIndex].push(board[lastIndex].val);
        // set val back to null
        setBoardCell(lastIndex, null);
        // reset candidates, only in model.
        resetCandidates(false);
        // reset invalid candidates for cellIndex
        invalidCandidates[cellIndex] = [];
        // then try again
        generateBoardAnswerRecursively(lastIndex);
        return false;
    }
}

function easyEnough(data) {
    // console.log(data.level);
    if (data.level === DIFFICULTY_EASY)
        return true;
    if (data.level === DIFFICULTY_MEDIUM)
        return difficulty !== DIFFICULTY_EASY;
    if (data.level === DIFFICULTY_HARD)
        return difficulty !== DIFFICULTY_EASY && difficulty !== DIFFICULTY_MEDIUM;
    if (data.level === DIFFICULTY_VERY_HARD)
        return difficulty !== DIFFICULTY_EASY && difficulty !== DIFFICULTY_MEDIUM && difficulty !== DIFFICULTY_HARD;
}
function hardEnough(data) {
    if (difficulty === DIFFICULTY_EASY)
        return true;
    if (difficulty === DIFFICULTY_MEDIUM)
        return data.level !== DIFFICULTY_EASY;
    if (difficulty === DIFFICULTY_HARD)
        return data.level !== DIFFICULTY_EASY && data.level !== DIFFICULTY_MEDIUM;
    if (difficulty === DIFFICULTY_VERY_HARD)
        return data.level !== DIFFICULTY_EASY && data.level !== DIFFICULTY_MEDIUM && data.level !== DIFFICULTY_HARD;
}

function digCells() {
    var cells = [];
    var given = boardSize * boardSize;
    var minGiven = 17;
    if (difficulty === DIFFICULTY_EASY) {
        minGiven = 40;
    } else if (difficulty === DIFFICULTY_MEDIUM) {
        minGiven = 30;
    }
    if (boardSize < 9) {
        minGiven = 4
    }
    for (var i = 0; i < boardSize * boardSize; i++) {
        cells.push(i);
    }

    while (cells.length > 0 && given > minGiven) {
        var randIndex = Math.round(Math.random() * (cells.length - 1));
        var cellIndex = cells.splice(randIndex, 1);
        var val = board[cellIndex].val;

        // remove value from this cell
        setBoardCell(cellIndex, null);
        // reset candidates, only in model.
        resetCandidates(false);

        var data = analyzeBoard();
        if (data.finished !== false && easyEnough(data)) {
            given--;
        } else {
            // reset - don't dig this cell
            setBoardCell(cellIndex, val);
        }

    }
}

// generates board puzzle, i.e. the answers for this round
// requires that a board for boardSize has already been initiated
function generateBoard(diff, callback) {
    // if(_boardInputs)
    // 	clearBoard();
    if (contains(DIFFICULTIES, diff)) {
        difficulty = diff
    } else if (boardSize >= 9) {
        difficulty = DIFFICULTY_MEDIUM
    } else {
        difficulty = DIFFICULTY_EASY
    }
    generatingMode = true;
    solveMode = SOLVE_MODE_ALL;

    // the board generated will possibly not be hard enough
    // (if you asked for "hard", you most likely get "medium")
    generateBoardAnswerRecursively(0);

    // attempt one - save the answer, and try digging multiple times.
    var boardAnswer = board.slice();

    var boardTooEasy = true;

    while (boardTooEasy) {
        digCells();
        var data = analyzeBoard();
        if (hardEnough(data))
            boardTooEasy = false;
        else
            board = boardAnswer;
    }
    solveMode = SOLVE_MODE_STEP;
    // if(_boardInputs)
    // 	updateUIBoard();

    visualEliminationOfCandidates();
    if (typeof callback === 'function') {
        callback(boardAnswer);
    }
}


/*
 * init/API/events
 *-----------*/

function startNewPuzzle(o, cb) {
    clearBoard();
    opts = o;
    if (!opts.board) {
        initBoard(opts);
        generateBoard(opts.difficulty, cb);
        // renderBoard();
    } else {
        board = opts.board;
        initBoard(opts);
        // renderBoard();
        visualEliminationOfCandidates();
    }
}


/**
 * PUBLIC methods
 * ----------------- */
function solveAll() {
    solveMode = SOLVE_MODE_ALL;
    var canContinue = true;
    while (canContinue) {
        var startStrat = onlyUpdatedCandidates ? 2 : 0;
        canContinue = solveFn(startStrat);
    }
}

function solveStep() {
    solveMode = SOLVE_MODE_STEP;
    var startStrat = onlyUpdatedCandidates ? 2 : 0;
    solveFn(startStrat);
}

function getBoard() {
    return board;
}

function setBoard(newBoard) {
    clearBoard(); // if any pre-existing
    board = newBoard;
    initBoard();
    visualEliminationOfCandidates();
    updateUIBoard(false);
}

function hideCandidates() {
    // _board.removeClass("showCandidates");
    candidatesShowing = false;
}
function showCandidates() {
    // _board.addClass("showCandidates");
    candidatesShowing = true;
}

function etEditingCandidates(newVal) {
    editingCandidates = newVal;
}

function dontNeedAnalyze() {
    opts.needAnalyze = false;
}
module.exports = {
    getBoard: getBoard,
    solveStep: solveStep,
    solveAll: solveAll,
    startNewPuzzle: startNewPuzzle,
    updateCandidates: visualEliminationOfCandidates,
    setBoardCell: setBoardCell,
    dontNeedAnalyze: dontNeedAnalyze,
    removeCandidatesFromCells: removeCandidatesFromCells,
    getHouses: getHouses,
    checkConflict: checkConflict
};