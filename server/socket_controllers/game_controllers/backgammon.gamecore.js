const Alea = require('alea');

const randomRollResult = function(){
	var random = new Alea();
	
	var numOne = parseInt(random() * 7);
	if (numOne < 1) numOne = 1;
	if (numOne > 6) numOne = 6;
	
	var numTwo = parseInt(random() * 7);
	if (numTwo < 1) numTwo = 1;
	if (numTwo > 6) numTwo = 6;

    if(numOne == numTwo){
        numTwo = parseInt(random() * 7);
        if (numTwo < 1) numTwo = 1;
        if (numTwo > 6) numTwo = 6;
    }

    var numbers = [numOne,numTwo];
	return numbers;
};

function initGameArea(){
    var gameArea = {"1":{"6":5,"8":3,"13":5,"24":2},"2":{"1":2,"12":5,"17":3,"19":5}};

    //var gameArea = {"1":{"1":2,"2":5,"3":5,"4":2,"6":1}, "2":{"7":2,"13":1,"14":2,"16":1,"17":2, "18":1, "20":1, "21":1, "22":1, "23":3}};

    return gameArea;
}

function validateMove(moves, gameStatus, socket, real_player_turn) {

	var player1_id = gameStatus.player_1.userId;
	var player2_id = gameStatus.player_2.userId;
	var player_turn 	= player1_id == socket.request.userId ? 1 : 2;
	
	if( real_player_turn == player_turn/* && $room['player_last']!=$player_turn && $room['step']==2 */) {
		var dice = gameStatus.zar;
		
		var playableDice = dice[1] != dice[2] ? dice : {1: dice[1], 2: dice[1], 3: dice[1], 4: dice[1]};
		var pullar = gameStatus.gameArea;

		var puls_temp = Object.keys(moves).length > 0 ? check_moves(moves, playableDice, player_turn, pullar ) : false;

		if( puls_temp != false ){
			var ansObj =
				{
					hamle: moves,
					gameArea: puls_temp,
					player_last: player_turn
				};
			return ansObj;

		} else {
            var ansObj =
                {
                    hamle: '',
                    player_last: player_turn
                };
            return ansObj;
		}
	} else {
		return false;
	}
}

function calc_moves(turn, puls, playableDice) {
	var available_moves = {};

	var sum = 0;
	for (var i in puls[turn]) {
		sum += puls[turn][i];
	}
	if( sum < 15 ){ 
		for(var di in playableDice) {
			var d = playableDice[di];
			var to = turn == 1 ? 25 - d : d;
			
			if( is_proper_move( to, 99, d, turn, puls )  ){ 
				if (!available_moves[di]) {
					available_moves[di] = {};
				}
				available_moves[di][99] = to; 
			}	
		}
		
	} else {
		for (var l in puls[turn]) {
			var p = puls[turn][l];
			for (var di in playableDice) {
				var d = playableDice[di];
				
				var to = turn == 1 ? Number(l) - d : Number(l) + d;
				to = Math.min( Math.max(to, 0), 25 );
														
				if(  is_proper_move( to, l, d, turn, puls ) ){
					if (!available_moves[di]) {
						available_moves[di] = {};
					}
					available_moves[di][l] = to;
				}
			}
		}
	}	

	return available_moves;
}


function check_moves(moves, playableDice, turn, puls) {
	
	
	var turn_against = turn == 1 ? 2 : 1; 

	for (var i in moves) {
		var move = moves[i];
		var di = Object.keys(move)[0];
		var _from = Number(Object.keys(move[di])[0]);
		var to   = move[di][_from];
		var dice = playableDice[di];

		if( ! is_proper_move(to, _from, dice, turn, puls) ){
			console.log("Detected invalid moves.");
			return false;
		} else {
			
			if( _from != 99 ){
				puls[turn][_from]--; 
				if( puls[turn][_from] == 0 ){ 
					delete puls[turn]["" + _from]; 
				}		
			}
			
			puls[turn][to] = (puls[turn][to] != undefined) ? puls[turn][to] + 1 : 1;

			if( puls[turn_against][to] != undefined) { 
				puls[turn_against][to]--; 
				if(puls[turn_against][to] == 0) { 
					delete puls[turn_against]["" + to]; 
				}
			}
		}
		
	}
	
	return puls;
}

function is_proper_move( to, _from, dice, turn, puls ){
	dice = Number(dice);
	var turn_against = turn == 1 ? 2 : 1; 
	
	if( Number(_from) == 99 ) {
		var sum = 0;
		for (var i in puls[turn]) {
			sum += puls[turn][i];
		}
		if( sum == 15 ) { 
			return false;
		}
	} else if( puls[turn][_from] == undefined ) {
		return false;
	} else {
		var to_check = turn == 1 ? Number(_from) - dice : Number(_from) + dice; 
		if( turn==1 && to_check < 0 ) { 
			to_check=0; 
		}
		
		if( turn==2 && to_check > 25 ){ 
			to_check=25; 
		}

		if( to_check != to ){  
			return false; 
		}

		if( to == 0 || to == 25 ) {
			if( ! is_topluyor(turn, puls) ){
				return false;
			} else {
				if( Number(_from) == dice || Number(_from) == 25 - dice ){
					return true;					
				} else {

					if( to==0 ){ 
						for(var i = Number(_from) + 1; i <= 6; i++) {
							if(puls[turn][i] != undefined) { 
								return false;
							}	
						}
					} else { 
						for(var i = 19; i < Number(_from); i++){ 						
							if( puls[turn][i] != undefined) {
								return false;
							}	
						}	
					}

					return true;
				}
			}
		}
	}
	

	if( puls[turn_against][to] == undefined || puls[turn_against][to] < 2 ){
		return true;
	}else{
		return false;
	}	
}


function is_topluyor(player, puls){

	if (player == 1) {
		for (var l in puls[player]) {
			var p = puls[player][l];
			if( l > 6 ){ 
				return false; 
			}	
		}
	} else {
		for (var l in puls[player]) {
			var p = puls[player][l];
			if( l < 19 ){ 
				return false; 
			}	
		}
	}
	
	return true;
}

function is_finished(player, puls){
	var to = player==1 ? 0 : 25;
	if (puls[player][to] && puls[player][to]==15) {
		return true;
	} else {
		return false;
	}
}

function autoplay(gameStatus, player_turn, cb) {
	var dice = gameStatus.zar;
	var pullar = gameStatus.gameArea;
		
	var playableDice = dice[1] != dice[2] ? dice : {1: dice[1], 2: dice[1], 3: dice[1], 4: dice[1]};
	
	var tmpPlayableDice = JSON.parse(JSON.stringify(playableDice));
	var tempPullar = JSON.parse(JSON.stringify(pullar));

	autoMovePlay(player_turn, tempPullar, tmpPlayableDice, function(moves) {
		console.log("Auto Move Play = " + JSON.stringify(moves));

		if (Object.keys(moves).length == 0) {
			var ansObj =
			{
				hamle: '',
				gameArea: pullar,
				player_last: player_turn
			};
			cb(ansObj);
		} else {

			var _moves = {};
            var i = 0;
            for (var key in moves) {
                _moves["" + i] = {};
                _moves["" + i][key] = moves[key];
                i++;
            }
			var puls_temp = check_moves(_moves, playableDice, player_turn, pullar );
		
			if( puls_temp != false ) {
				var ansObj = {
					hamle: _moves,
					gameArea: puls_temp,
					player_last: player_turn
				};
				cb(ansObj);
			} else {
				var ansObj = {
					hamle: '',
					gameArea: pullar,
					player_last: player_turn
				};
				cb(ansObj);
			}
		}
	});
	/*
	recursive_autoplay(player_turn, tempPullar, tmpPlayableDice, {}, pullar, function (moves, _moves, puls_temp) {
        console.log("_moves = " + JSON.stringify(_moves));

		var ansObj = {
			hamle: _moves,
			gameArea: puls_temp,
			player_last: player_turn
		};

        cb(ansObj);
		
	});
	*/
}

function recursive_autoplay(o_turn, o_puls, o_playableDice, o_moves, o_pullar, cb) {

	var chooseAutoPlayMoves = function (turn, puls, playableDice, moves) {
        var turn_against = turn == 1 ? 2 : 1;
        var available_moves = calc_moves(turn, puls, playableDice);
        var from = null;
        var di = Object.keys(playableDice)[0];

        if (available_moves[di] && available_moves[di][99]) {
            from = 99;
            to = available_moves[di][from];
            if (moves["" + di] == undefined) {
                moves["" + di] = {};
            }
            moves["" + di]["" + from] = "" + to;

            delete available_moves[di]["" + from];
        } else if( available_moves[di] )  {
            if( turn==1 ) {
                function compareNumbers(a, b) {
                    return Number(b) - Number(a);
                }
                from = Object.keys(available_moves[di]).sort(compareNumbers)[0];

            } else {
                from = Object.keys(available_moves[di]).sort()[0];
            }
            console.log("from = " + from);
            console.log("available_moves = " + JSON.stringify(available_moves));
            var to   	= available_moves[di][from];
            if (moves["" + di] == undefined) {
                moves["" + di] = {};
            }
            moves["" + di]["" + from] = to;
        }

        if(Number(from)) {
            if( Number(from) != 99 ){
                puls[turn][from]--;
                if( puls[turn][from] == 0) {
                    delete puls[turn][from];
                }
            }

            puls[turn][to] = (puls[turn][to] != undefined) ? puls[turn][to] + 1 : 1;

            if(puls[turn_against][to]) {
                puls[turn_against][to]--;
                if(puls[turn_against][to] == 0) {
                    delete puls[turn_against][to];
                }
            }

            delete playableDice[di];
        } else {
            if(di==1 && Object.keys(playableDice).length == 2 ){
                playableDice = array_reverse(playableDice, true);
            }else{
                delete playableDice[di];
            }
        }

        if(!Object.keys(playableDice).length) {
            var _moves = {};
            var i = 0;
            for (var key in moves) {
                _moves["" + i] = {};
                _moves["" + i][key] = moves[key];
                i++;
            }

			console.log("_moves = " + JSON.stringify(_moves));
			console.log("o_playableDice = " + JSON.stringify(o_playableDice));
			console.log("o_pullar = " + JSON.stringify(o_pullar));

            var puls_temp = Object.keys(moves).length > 0 ? check_moves(_moves, o_playableDice, o_turn, o_pullar ) : false;
            if ( puls_temp != false ) {
            	cb(moves, _moves, puls_temp);
            } else {
                chooseAutoPlayMoves(turn, puls, playableDice, moves);
            }
        } else {
            chooseAutoPlayMoves(turn, puls, playableDice, moves);
        }
    };

	var playbleDice = JSON.parse(JSON.stringify(o_playableDice));
    chooseAutoPlayMoves(o_turn, o_puls, playbleDice, o_moves);
}

function autoMovePlay(turn, puls, playableDice, cb) {
	var moves = {};
	var turn_against = turn == 1 ? 2 : 1;
	var available_moves = calc_moves(turn, puls, playableDice);
	console.log(JSON.stringify(available_moves));

	if (Object.keys(available_moves).length == 0) {
		cb(moves);
	} else {
		if (Object.keys(playableDice).length == 4) {
			var di_index = 0;
			while (Object.keys(playableDice).length > 0) {
				var available_moves = calc_moves(turn, puls, playableDice);
				console.log("available movies = " + JSON.stringify(available_moves));
				var di = Object.keys(playableDice)[di_index];
	
				var from = null;
				console.log("di = " + di);
				if (available_moves[di]) {
					if (available_moves[di][99]) {
						from = 99;
						to = available_moves[di][from];
						if (moves["" + di] == undefined) {
							moves["" + di] = {};
						}
						moves["" + di]["" + from] = "" + to;
						delete available_moves[di]["" + from];
					} else {
						var keys;
						if( turn == 1 ) {
							function compareNumbers(a, b) {
								return Number(b) - Number(a);
							}
							keys = Object.keys(available_moves[di]).sort(compareNumbers);
				
						} else {
							function compareNumbers1(a, b) {
								return Number(a) - Number(b);
							}
							keys = Object.keys(available_moves[di]).sort(compareNumbers1);
						}

						console.log("key count = " + JSON.stringify(keys));
						if (keys.length > 0) {
							from = keys[0];
							console.log("from = " + from);
							var to = available_moves[di][from];
							if (moves["" + di] == undefined) {
								moves["" + di] = {};
							}
							moves["" + di]["" + from] = to;	
						}
					}
				}
	
				if(from) {
					console.log(" = from = " + from);
					if( Number(from) != 99 ){
						puls[turn][from]--;
						if( puls[turn][from] == 0) {
							delete puls[turn][from];
						}
					}
			
					puls[turn][to] = (puls[turn][to] != undefined) ? puls[turn][to] + 1 : 1;
			
					if(puls[turn_against][to]) {
						puls[turn_against][to]--;
						if(puls[turn_against][to] == 0) {
							delete puls[turn_against][to];
						}
					}
					delete playableDice[di];		
				} else {
					break;
				}
			}
			cb(moves);
		} else {
			var di_index = 0;
			while (Object.keys(playableDice).length > 0) {
				var available_moves = calc_moves(turn, puls, playableDice);
				var di = Object.keys(playableDice)[di_index];
	
				var from = null;
				if (available_moves[di]) {
					if (available_moves[di][99]) {
						from = 99;
						to = available_moves[di][from];
						if (moves["" + di] == undefined) {
							moves["" + di] = {};
						}
						moves["" + di]["" + from] = "" + to;
						delete available_moves[di]["" + from];
					} else {
						var keys;
						if( turn == 1 ) {
							function compareNumbers(a, b) {
								return Number(b) - Number(a);
							}
							keys = Object.keys(available_moves[di]).sort(compareNumbers);
				
						} else {
							keys = Object.keys(available_moves[di]).sort();
						}
						if (keys.length > 0) {
							from = keys[0];
							var to = available_moves[di][from];
							if (moves["" + di] == undefined) {
								moves["" + di] = {};
							}
							moves["" + di]["" + from] = to;	
						}
					}
				}
	
				if(from) {
					if( Number(from) != 99 ){
						puls[turn][from]--;
						if( puls[turn][from] == 0) {
							delete puls[turn][from];
						}
					}
			
					puls[turn][to] = (puls[turn][to] != undefined) ? puls[turn][to] + 1 : 1;
			
					if(puls[turn_against][to]) {
						puls[turn_against][to]--;
						if(puls[turn_against][to] == 0) {
							delete puls[turn_against][to];
						}
					}
			
					delete playableDice[di];
					if (di_index == 1) {
						 di_index = 0;
						 continue;
					}
					
				} else {
					if (Object.keys(playableDice).length == 1) {
						break;
					} else {
						di_index++;
						if (di_index == 2) {
							break;
						}
					}
				}
			}
			cb(moves);
		}
	}
};

function array_reverse(array, preserveKeys) {
  
	var isArray = Object.prototype.toString.call(array) === '[object Array]';
	var tmpArr = preserveKeys ? {} : [];
	var key;
	if (isArray && !preserveKeys) {
		return array.slice(0).reverse();
	}
	if (preserveKeys) {
		var keys = [];
		for (key in array) {
			keys.push(key);
		}
		var i = keys.length;
		while (i--) {
			key = keys[i];
			tmpArr[key] = array[key];
		}
	} else {
		for (key in array) {
			tmpArr.unshift(array[key]);
		}
	}
	return tmpArr;
}



exports.initGameArea = initGameArea;
exports.randomRollResult = randomRollResult;
exports.validateMove = validateMove;
exports.autoplay = autoplay;
exports.is_finished = is_finished;
exports.autoMovePlay = autoMovePlay;