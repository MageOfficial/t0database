var express = require('express');
var app = express();
app.use(express.static('public'));
var http = require('http').Server(app)
var io = require('socket.io')(http);

const port = process.env.PORT || 8080;

class Leaf {
    constructor(move, parent) {
        this.move = move;
        this.children = {};
        this.parent = parent;
        this.total = 0;
        this.whitewin = 0;
        this.draw = 0;
        this.terminal = false;
    };
}

io.on('connection', function (socket) {
    console.log('new connection ' + socket);


    socket.on('search', function (player, colorWhite, colorBlack, depth, minGames) {
        const csvFilePath = 'Data.csv'
        const csv = require('csvtojson')
        var Chess = require('5d-chess-js');
        var readlineSync = require('readline-sync');

        searchData(player, colorWhite, colorBlack, depth, minGames)
        var outputStr=""
        function outputInfo(chess, name, node, indent = "  ", gameMin) {


            var printName = name
            if (name != "Initial State") {
                printName = chess.raw.pgnFuncs.fromMove(node.move[0], chess.rawBoard, chess.rawAction)
                for(var i=1; i<node.move.length;i++){
                    printName += " " + chess.raw.pgnFuncs.fromMove(node.move[i], chess.rawBoard, chess.rawAction)
                }
            }
            //console.log(indent + printName + " : total " + node._total + " , number = " + node._num + " , UCB1 = " + node.UCB1() )
            if (node.total >= gameMin) {
                outputStr += indent + (chess.rawAction) + "." + printName + " : WWR = " + (node.whitewin / node.total).toFixed(3) + " : Games = " + node.total + "\n"
                for (name of Object.keys(node.children)) {

                    var tempChess = chess.copy()
                    for(var i=0; i<node.children[name].move.length;i++){
                    tempChess.raw.boardFuncs.move(tempChess.rawBoard, node.children[name].move[i]);
                    }
                    tempChess.rawBoardHistory.push(tempChess.raw.boardFuncs.copy(tempChess.rawBoard));
                    tempChess.rawAction++;
                    outputInfo(tempChess, name, node.children[name], indent + "  ",gameMin)
                }
            }
            return outputStr;
        }
        /*
        Currently Unused but will be used to conclude what lines are complete loses and should not be looked at
        
        function mateprop(child, value) { //used for when a node is found to be mate
            child.total = value;
            child.total += 1;
            if (value == Infinity) { //if a move is mate it will always be chosen making the parent always avoided when possible
                mateprop(child._parent, -value);
                return;
            }
            else if (child.parent != false) { //if a -Infinity is entered it checks if the parents children are all -Infinity and mate can not be avoided thus making the parent a move which forces mate
                for (childname of Object.keys(child.parent.children)) {
                    if (child.parent.children[childname].total != value) {
                        if (value == -Infinity) { // If a child fails to be -Infinity then it just propagates back as a win for the opposite color
                            add(child.parent, 1);
                        }
                        else {
                            add(child.parent, 0);
                        }
                        return;
                    }
                }
                mateprop(child.parent, -value);
            }
        }
        */
        function add(child, value) {
            child.whitewin += value;
            child.total += 1;
            if (child.parent != undefined) {
                add(child.parent, value)
            }
        }
        function searchData(player, colorWhite, colorBlack, depth, minGames) {
            csv().fromFile(csvFilePath).then((jsonObj) => {
                var tree = new Leaf();
                for (game of jsonObj) {
                    if ((player == "") || ((colorBlack * (game.BlackPlayer == player)) || (colorWhite * (game.WhitePlayer == player)))) {
                        var chess = new Chess();
                        chess.skipDetection = true;
                        var input = game.Game;
                        chess.import(input);
                        game.Game = chess.export('5dpgn');

                        var current = tree
                        for (let i = 0; (i < chess.rawActionHistory.length && i < depth); i++) {
                            var newLeaf = new Leaf(chess.rawActionHistory[i], current);

                            if ((!current.children) || current.children[chess.rawActionHistory[i]] == undefined) {
                                current.children[chess.rawActionHistory[i]] = newLeaf
                                current = newLeaf
                            }
                            else {
                                current = current.children[chess.rawActionHistory[i]]
                            }
                        }

                        add(current, Number(game.White))

                    }
                }
                var chess = new Chess();
                socket.emit('searchcomplete', outputInfo(chess, "Initial State", tree,"  ", minGames));
                var node = tree
                var chess = new Chess();
                //console.log(tree)
                //treeSearch(chess,node)
            })
        }

        function treeSearch(chess, node) {


            while (0 == 0) {
                var userName = readlineSync.question('Move\n');

                var objName = chess.raw.pgnFuncs.toMove(userName, chess.rawBoard, chess.rawAction)
                var node = node.children[objName]

                chess.raw.boardFuncs.move(chess.rawBoard, objName);
                chess.rawBoardHistory.push(chess.raw.boardFuncs.copy(chess.rawBoard));
                chess.rawAction++;
                //console.log(chess.print())
                console.log((chess.rawAction) + "." + chess.raw.pgnFuncs.fromMove(node.move[0], chess.rawBoard, chess.rawAction) + " : WWR = " + node.whitewin / node.total + " : Games = " + node.total)
                for (action of Object.keys(node.children)) {
                    var tempChess = chess.copy()
                    tempChess.raw.boardFuncs.move(tempChess.rawBoard, node.children[action].move[0]);
                    tempChess.rawBoardHistory.push(tempChess.raw.boardFuncs.copy(tempChess.rawBoard));
                    tempChess.rawAction++;
                    console.log("   " + (tempChess.rawAction) + "." + tempChess.raw.pgnFuncs.fromMove(node.children[action].move[0], tempChess.rawBoard, tempChess.rawAction) + " : WWR = " + node.children[action].whitewin / node.children[action].total + " : Games = " + node.children[action].total)
                }

            }
        }
        
    });


})

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(port, function () {
    console.log('listening on *: ' + port)
});
