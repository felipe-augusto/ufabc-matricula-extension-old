'use strict';

var cursos = [];
var last_disciplina
var user = ""
// pega as disciplinas com os professores

chrome.storage.local.get('ufabc-extension-last', function(items) {
    // se nao tiver professores, tem que fazer a requisicao
    if (Object.keys(items).length == 0) {
        getProfessores();
    } else {
        // quanto tempo passou desde a ultima vez que fizemos a requisicao
        var timeDiff = Math.abs(new Date() - new Date(items['ufabc-extension-last']));
        var minutes = Math.floor(timeDiff / 1000 / 60);
        // se passou mais que 30 minutos refaz a requisicao
        if (minutes >= 30) {
            console.log('Atualizei os professores');
            getProfessores();
        }
    };
});

// guarda os professores num localstorage
function getProfessores () {
   $.get('https://desolate-lake-30493.herokuapp.com/disciplinas', function( data , textStatus, request) {
        chrome.storage.local.set({'ufabc-extension-last': request.getResponseHeader('Last-Modified')});
        chrome.storage.local.set({'ufabc-extension-disciplinas': data});
    }); 
}

// disciplinas que mudaram de nome (HARDCODED)
var disciplinas_mudadas = {"Energia: Origens, Conversão e Uso" : "Bases Conceituais da Energia",
                            "Transformações nos Seres Vivos e Ambiente" : "Biodiversidade: Interações entre organismos e ambiente",
                            "Transformações Bioquímicas" : "Bioquímica: estrutura, propriedade e funções de Biomoléculas",
                            "Origem da Vida e Diversidade dos Seres Vivos" : "Evolução e Diversificação da Vida na Terra"}


function getDisciplinas(url, i) {
    // entra na ficha para pegar o cr, ca e cp
    // detalhe importante, cada curso tem um cp associado
    var ficha_url = url.replace('.json', '');
    $.get( 'https://aluno.ufabc.edu.br' + ficha_url, function( data ) {
        var ficha_obj = $($.parseHTML(data));
        var info = ficha_obj.find('.coeficientes tbody tr td');
        cursos[i - 1].cp = parseFloat(info[0].innerText.replace(',', '.'));
        cursos[i - 1].cr = parseFloat(info[1].innerText.replace(',', '.'));
        cursos[i - 1].ca = parseFloat(info[2].innerText.replace(',', '.'));
        console.log(cursos[i - 1]);
        // para ter certeza que as info de CR ja foram colocadas
        $.get( 'https://aluno.ufabc.edu.br' + url, function( data ) {
            // porque i - 1?
            cursos[i - 1].cursadas = data;
            var obj= {};
            obj[user] = cursos;
            chrome.storage.local.set(obj);
            toastr.info('Salvando disciplinas do curso do ' + cursos[i - 1].curso + ' para o usuário ' + user + '.');
        });
    });

    
}

// quando carrega qualquer pagina fazemos isto
window.addEventListener('load', function() {
	var url = document.location.href;
	// essa url mapeia a pagina principal da ficha individual
    if(url.indexOf('aluno.ufabc.edu.br/fichas_individuais') != -1) {
        toastr.info('A mágica começa agora...');
        // pega o email da ufabc
        user = $('#top li').last().text().replace(/\s*/,'').split('|')[0].replace(' ','');
    	$('tbody').children().each(function (child) {
    		if ($(this).children('th').length == 0) {
    			// nao estamos no header da tabela
    			var linha = $(this).children();
    			// 0 -> curso
    			// 3 -> turno
    			// 6 -> situacao
    			var count = 0;
                var obj = {};
    			linha.each(function (i) {
    				var texto = $(this).text();
    				if (count == 0) {
    					var texto = $(this).children('a').text();
                        obj.curso = texto;
    				} else if (count == 1) {
                        var texto = $(this).children('a').attr('href');
                        getDisciplinas(texto, child);
                    } else if (count == 3) {
    					obj.turno = texto;
    				} else if (count == 6) {
						obj.situacao = texto;
    				};
    				count += 1;
    			});
                cursos.push(obj);
    		};
    	});
    };
   // essa url mapeia a pagina principal da matricula (versao nova)
   if(url.indexOf('matricula.ufabc.edu.br/matricula') != -1) {
        // inject chart.js
        injectChart();

        //inject styles
        injectStyles();

        // manda as informacoes para o servidor
        sendAlunoData();

        // append quantidade total de matriculas
        appendMatriculas();

        toastr.info('Aplicando anabolizantes...');
        // cria elementos com filtros e da um append no documento
        var filters = "<div class='col-md-3'><label for='ufabc-extension'>Filtros monstros</label><br><input type='checkbox' id='removeCursadas'> Remover disciplinas cursadas<br><input type='checkbox' id='loadHelp'> Carregar Professores<br><input type='checkbox' id='apenasMatriculadas'> Mostrar matérias selecionadas</div>";

        // poe filtros monstros e arruma para aparecer correto na tela
        $(".busca").parent().append(filters);
        $(".busca").parent().children(".col-md-6").removeClass("col-md-6").addClass("col-md-3");

        // cria handler para matriculas selecionadas
        criaHandlerSelecionadas();

        // cadastrar handler para click removeCursadas
        $( "#removeCursadas" ).click(function(e) {
            // se a checkbox for false, faz aparecer novamente as disciplinas
            if (!$(e.target).is(':checked')) {
                $(".isCursada").css('display', '');
                return;
            };
            // se ja tiver calculado nao refaz o trabalho
            if ($(".isCursada").length > 0) {
                $(".isCursada").css('display', 'none');
                return;
            }
            // ve qual user esta pedindo as disciplinas
            var current_user = $('#usuario_top').text().replace(/\s*/, '').split('|')[0].replace(' ', '');
            toastr.info('Pegando disciplinas de ' + current_user + '.');
            // pega as disciplinas ja cursadas
            chrome.storage.local.get(current_user, function (item) {
                
                if (item[current_user] == null) {
                    toastr.info('Nao temos as disciplinas que voce cursou! <a href="https://aluno.ufabc.edu.br/" target="_blank"> Clique aqui</a> para carrega-las.' );
                    return;
                }
                item = item[current_user]; 
                // guardar as disciplinas ja cursadas aqui
                var ja_cursadas = {};
                // se nao tiver nada precisa mandar ele cadastrar
                var todas_cursadas = item[0].cursadas;
                for (var i = 0; i < todas_cursadas.length; i++) {
                    var codigo = todas_cursadas[i].codigo; // codigos mudam com o passar do tempo, nao rola
                    var conceito = todas_cursadas[i].conceito;
                    var disciplina = todas_cursadas[i].disciplina;
                    if (conceito === 'A' || conceito === 'B' || conceito === 'C' || conceito === 'D') {
                        ja_cursadas[disciplina] = true;
                        for (var key in disciplinas_mudadas) {
                            if (key === disciplina) {
                                ja_cursadas[disciplinas_mudadas[key]] = true;
                                delete disciplinas_mudadas[key];
                            }
                        }
                        
                    }                
                }
                // pega a table principal de disciplinas
                $("table tr td:nth-child(3)").each(function () {
                    var el = $(this);
                    // tira apenas o nome da disciplina -> remove turma, turno e campus
                    var disciplina = el.text().split("-")[0];
                    disciplina = disciplina.substring(0, disciplina.lastIndexOf(" "));
                    // verifica se ja foi cursada
                    if (ja_cursadas[disciplina]) {
                        el.parent().addClass("isCursada");
                        el.parent().css('display', 'none');
                    };
                });
            });
        });

        // cadastra handler para loadHelp
        $( "#loadHelp" ).click(function(e) {
            // se a checkbox for false, faz aparecer novamente os professores
            if (!$(e.target).is(':checked')) {
                $(".isHelp").css('display', 'none');
                return;
            };
            // se ja tiver calculado nao refaz o trabalho
            if ($(".isHelp").length > 0) {
                $(".isHelp").css('display', '');
                return;
            }
            toastr.info('Preparando whey protein...');
            // opcao de mostrar os professores
            chrome.storage.local.get('ufabc-extension-disciplinas', function (item) {
                // implementar chart.js para ver o pie extraido do help
                var disciplinas = item["ufabc-extension-disciplinas"];
                // cria uma hash
                var hash_disciplinas = {}
                for (var i = 0; i < disciplinas.length; i++) {
                    hash_disciplinas[disciplinas[i].disciplina + "@" + disciplinas[i].turma + "@" + disciplinas[i].turno +"@" + disciplinas[i].campus.replace(' do Campo', '')] = disciplinas[i];
                };
                // pega a table principal de disciplinas
                $("table tr td:nth-child(3)").each(function () {
                    var el = $(this);
                    // transforma da mesma forma que hash foi feita
                    try {
                        var disciplina = el.text().split("-")[0];
                        var turma = disciplina.substring(disciplina.lastIndexOf(" ")).replace(" ", "");
                        disciplina = disciplina.substring(0, disciplina.lastIndexOf(" "));
                        var turno = el.text().split("(");
                        var campus = turno[1].replace(")", "");
                    } catch (err) {
                        return;
                    }

                    if (turno[0].indexOf('atutino') != -1) {
                        turno = "diurno";
                    } else if (turno[0].indexOf('oturno') != -1) {
                        turno = "noturno";
                    }

                    var search = disciplina + "@" + turma + "@" + turno + "@" + campus;
                    try {
                        var item = hash_disciplinas[search].teoria_help;
                        el.append('<div class="col-md-12 isHelp ufabc-extension-prof ufabc-well ufabc-transparent">Professor: <a href="' + item.url +'" target="_blank">' + item.professor + '</a></div>');
                        el.append('<div class="col-md-12 isHelp ufabc-extension-font"><div class="col-md-6 ufabc-well ufabc-green"><strong>CR ALUNO: </strong><span>' + item.cr_aluno + '</span></div><div class="col-md-6 ufabc-well ufabc-orange">CR PROFESSOR: ' + item.cr_professor +'</div><div class="col-md-6 ufabc-well ufabc-red">REPROVAÇÕES: ' + item.reprovacoes + '</div><div style="cursor: pointer;" class="col-md-6 pie ufabc-well ufabc-blue" data=' + JSON.stringify(item.pie) + '>ESTATÍSTICAS</div></div>')
                    } catch (err) {

                    }

                });

                createPieListener();

                
            });
        });
   }
   

});

function criaHandlerRefresh () {
    // cria handler para refresh matriculas
    $( "#refreshMatriculas" ).click(function(e) {
        updateMatriculasTotal();
    });
}

function criaHandlerSelecionadas() {
    $( "#apenasMatriculadas" ).click(function(e) {
        // se a checkbox for false, faz aparecer novamente os professores
        if (!$(e.target).is(':checked')) {
            $(".notSelecionada").css('display', '');
            return;
        };
        // se ja tiver calculado nao refaz o trabalho
        // if ($(".notSelecionada").length > 0) {
        //     $(".notSelecionada").css('display', 'none');
        //     return;
        // }
        // pega o id do aluno e suas disciplinas
        getAlunoId(function (aluno_id) {
            getMatriculas(aluno_id, function (matriculas) {
                // constroi hash para iterar
                var hash = {};
                for (var i = 0; i < matriculas.length; i++) {
                    hash[matriculas[i]] = true;
                }
                // itera no tr e compara
                $('tr').each(function () {
                    // value da tr (id da disciplina)
                    var disciplina_id = $(this).attr('value');
                    if (!hash[disciplina_id] && disciplina_id != null) {
                        $(this).addClass("notSelecionada");
                        $(this).css('display', 'none');
                    } else if (hash[disciplina_id]) {
                        var el = $(':nth-child(5)', this);
                        // achamos uma disciplina
                        $.post( "https://desolate-lake-30493.herokuapp.com/simula", {disciplina_id: disciplina_id, aluno_id : aluno_id}, function( data ) {
                          var html = "(" + data.pos + "/" + data.total + ") ";
                          if (el.children('span').length) {
                            el.children('span').html(html);
                          } else {
                            el.html('<span style="color: red;">' + html + '</span> ' + el.text());
                          }
                          
                        }); 
                    }
                });
            })
        })
    })
};


// insire chart.js script na pagina de matricula
function injectChart () {
    var s = document.createElement('script');
    s.src = chrome.extension.getURL('bower_components/Chart.js/dist/Chart.js');
    (document.head || document.documentElement).appendChild(s); 
}

// injeta estilos proprios
function injectStyles () {
    var s = document.createElement("link");
    s.href = chrome.extension.getURL("styles/main.css");
    s.type = "text/css";
    s.rel = "stylesheet";
    document.head.appendChild(s); 
}

// cria o listener que escuta clickes para gerar pie charts
function createPieListener () {
    $( ".pie" ).click(function(e) {
        // checa para ver se ja nao exista um canvas
        // se existir toogle it
        if ($(e.target).parent().children('canvas').length > 0) {
            $(e.target).parent().children('canvas').remove();
        } else {

            try {
                var data = JSON.parse($(e.target).attr('data'));
                createCanvas($(e.target), data);
            } catch (err) {

            }
        }
        
    })
}

// cria canvas e em seguida o respectivo pie do elemento
function createCanvas(el, item) {
    var node = document.createElement("canvas");
    var id  = new Date().getTime();
    node.id = id;
    el.parent().append(node);

    var ctx = $("#" + id.toString());

    var possible_colors = {"A" : "rgb(124, 181, 236)", "B" : "rgb(67, 67, 72)", "C": "rgb(144, 237, 125)", "D" : "rgb(247, 163, 92)"};
    var possible_hover = {"A" : "rgb(149, 206, 255)", "B" : "rgb(92, 92, 97)", "C": "rgb(168, 255, 150)", "D" : "rgb(255, 188, 117)"};
    var info = [];
    var backColor = [];
    var hoverColor = [];
    var labels = [];

    for (var key in item) {
        labels.push(key);
        info.push(item[key]);
        backColor.push(possible_colors[key]);
        hoverColor.push(possible_hover[key]);
    }

    var data = {
        labels: labels,
        datasets: [
            {
                data: info,
                backgroundColor: backColor,
                hoverBackgroundColor: hoverColor
            }]
    };


    var myChart = new Chart(ctx, {
        type: 'pie',
        data: data
    });
}

// pega o id do aluno (interno do matriculas)
function getAlunoId(cb) {
    $('script').each(function () {
        var inside = $(this).text();
        var test = "todasMatriculas";
        if (inside.indexOf(test) != -1) {
            var regex = /matriculas\[(.*)\]/;
            var match = regex.exec(inside);
            cb(parseInt(match[1]));
        }
    });
}

// pega a quantidade total de matriculas efetudas ate o momento
function getMatriculasTotal(cb) {
    // pega a quantidade total de matriculas
    $.get('https://matricula.ufabc.edu.br/cache/matriculas.js', function (data) {
        data = JSON.parse(data.replace('matriculas=', '').replace(';', ''));
        var tamanho = Object.keys(data).length;
        cb(tamanho);
    });
}

// pega as matriculas de um determinado aluno
function getMatriculas(aluno_id, cb) {
    $.get('https://matricula.ufabc.edu.br/cache/matriculas.js', function (data) {
        try {
            data = JSON.parse(data.replace('matriculas=', '').replace(';', ''));
            cb(data[aluno_id]);
        } catch (err) {
            // teria que tentar novamente
        }
        
    });
}

// append no documento a quantidade total de matriculas
function appendMatriculas() {
    getMatriculasTotal(function (quantidade) {
        var html = '<p class="bg-success">Foram efetuadas <span id="matriculasTotal">' + quantidade + '</span> matriculas até o momento. <img width="20px" id="refreshMatriculas" style="cursor: pointer;" src="' + chrome.extension.getURL('images/refresh_small.png') +'"/></p>';
        $('form').before(html);
         // cria handler para materias selecionadas
        criaHandlerRefresh();
    })
}

function updateMatriculasTotal() {
    getMatriculasTotal(function (quantidade) {
        $("#matriculasTotal").html(quantidade);
    })
}

function sendAlunoData () {
    getAlunoId(function (aluno_id) {
        var current_user = $('#usuario_top').text().replace(/\s*/, '').split('|')[0].replace(' ', '');
        chrome.storage.local.get(current_user, function (item) {
                if (item[current_user] != null) {
                    item = item[current_user];
                    // remove as disciplinas cursadas
                    for (var i = 0; i < item.length; i++) {
                        delete item[i].cursadas;
                    }
                    $.post( "https://desolate-lake-30493.herokuapp.com/test", {data: item, aluno_id : aluno_id}, function( data ) {
                      $( ".result" ).html( data );
                    });
                }
                
            })
    })
}