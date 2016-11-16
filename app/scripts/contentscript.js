'use strict';

var real_url = 'matricula.html';
var test_url = 'matricula.ufabc.edu.br/matricula';

var endpoint = 'https://desolate-lake-30493.herokuapp.com/';
// 'https://desolate-lake-30493.herokuapp.com/'

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
   $.get(endpoint + 'disciplinas', function( data , textStatus, request) {
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

var TIMER;

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
   if(url.indexOf(test_url) != -1) {
        //inject styles
        injectStyles();

        // send all matriculas to server
        getAllMatriculas();

        // inject chart.js
        injectChart();

        // injeta modal
        injectModal();

        // manda as informacoes para o servidor
        sendAlunoData();

        // append quantidade total de matriculas
        appendMatriculas();

        // adiciona botao de cortes
        adicionaCortes();

        //handler de cortes
        handlerCortes();

        toastr.info('Carregando extensao...');
        // cria elementos com filtros e da um append no documento
        var filters = "<div class='col-md-12 extension'><div class='col-md-3'><label for='ufabc-extension'>Filtros monstros</label><br><input type='checkbox' id='removeCursadas'> Remover disciplinas cursadas<br><input type='checkbox' id='loadHelp'> Carregar Professores<br><input type='checkbox' id='apenasMatriculadas'> Mostrar matérias selecionadas</div><div class='col-md-6'><input type='text' class='form-control' id='search'>Bootstrap Switch Default<div class='material-switch pull-right'><input id='someSwitchOptionDefault' name='someSwitchOption001' type='checkbox'/><label for='someSwitchOptionDefault' class='label-default'></label></div></div></div>";
        var filters = "<div class='col-md-12 extension'><div class='col-md-12'><h2>ufabc matricula</h2></div><div class='col-md-3'><label for='ufabc-extension'>Filtros monstros</label><br><ul class='list-group'><li class='list-group-item'>Remover disciplinas cursadas<div class='material-switch pull-right'><input type='checkbox' id='removeCursadas'><label for='removeCursadas' class='label-success'></label></div></li><li class='list-group-item'>Carregar Professores<div class='material-switch pull-right'><input type='checkbox' id='loadHelp'><label for='loadHelp' class='label-success'></div><li class='list-group-item'>Mostrar matérias selecionadas<div class='material-switch pull-right'><input type='checkbox' id='apenasMatriculadas'><label for='apenasMatriculadas' class='label-success'></label></div></li><li class='list-group-item'>Professor com CR maior que: <input style='width: 51px;' value=0 type='number' id='cutHigh' min='0' max='4' step='0.25'></li></ul></div><div class='col-md-3'><label for='ufabc-extension'>Filtros por câmpus</label><br><ul class='list-group'><li class='list-group-item'>Santo André<div class='material-switch pull-right'><input type='checkbox' id='andre'><label for='andre' class='label-success'></label></div></li><li class='list-group-item'>São Bernardo do Campo<div class='material-switch pull-right'><input type='checkbox' id='bernardo'><label for='bernardo' class='label-success'></label></div></li></div><div class='col-md-3'><label for='ufabc-extension'>Filtros por turno</label><br><ul class='list-group'><li class='list-group-item'>Matutino<div class='material-switch pull-right'><input type='checkbox' id='fmatutino'><label for='fmatutino' class='label-success'></label></div></li><li class='list-group-item'>Noturno<div class='material-switch pull-right'><input type='checkbox' id='fnoturno'><label for='fnoturno' class='label-success'></label></div></li></ul></div><div class='col-md-3'></div><div class='col-md-12'><span class='pull-right'>Made with ☕</span></div></div>"
        // poe filtros monstros e arruma para aparecer correto na tela
        $(".busca").parent().append(filters);
        $(".busca").parent().children(".col-md-6").removeClass("col-md-6").addClass("col-md-3");

        // handlers filtros iguais ufabc
        sameHandlers();

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
                    toastr.info('Nao temos as disciplinas que voce cursou! <a href="https://aluno.ufabc.edu.br/" target="_blank" style="color: #FFF;"> Clique aqui</a> para carrega-las.' );
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
            toastr.info('Carregando professores...');
            // opcao de mostrar os professores
            chrome.storage.local.get('ufabc-extension-disciplinas', function (item) {
                // implementar chart.js para ver o pie extraido do help
                var disciplinas = item["ufabc-extension-disciplinas"];
                // cria uma hash
                var hash_disciplinas = {}
                for (var i = 0; i < disciplinas.length; i++) {
                    hash_disciplinas[disciplinas[i].disciplina + "@" + disciplinas[i].turma + "@" + disciplinas[i].turno +"@" + disciplinas[i].campus.replace(' do Campo', '').trim()] = disciplinas[i];
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
                        var campus = turno[1].replace(")", "").split('|')[0].replace(/\s+$/, ''); 
                    } catch (err) {
                        return;
                    }

                    if (turno[0].indexOf('atutino') != -1) {
                        turno = "diurno";
                    } else if (turno[0].indexOf('oturno') != -1) {
                        turno = "noturno";
                    }

                    var search = disciplina + "@" + turma + "@" + turno + "@" + campus;;
                    try {
                        //se tiver professor de teoria
                        var html = '';
                        if(hash_disciplinas[search]) {
                            html += "<div data='" + JSON.stringify(hash_disciplinas[search]) +  "'>";
                        }
                        var item = '';
                        if (hash_disciplinas[search].teoria) {
                            try {
                                item = hash_disciplinas[search].teoria_help;
                                html += '<div class="col-md-12 isHelp ufabc-extension-prof ufabc-well ufabc-transparent" style="margin-top: 6px;">Teoria: <a href="' + item.url +'" target="_blank">' + item.professor + '</a></div>';
                            } catch (err) {
                                item = hash_disciplinas[search];
                                html += '<div class="col-md-12 isHelp ufabc-extension-prof ufabc-well ufabc-transparent">Teoria: <a href="' + '#' +'" target="_blank">' + item.teoria + '</a></div>';
                            }
                        } 
                        if(hash_disciplinas[search].pratica) {
                            try {
                                item = hash_disciplinas[search].pratica_help;
                                html += '<div class="col-md-12 isHelp ufabc-extension-prof ufabc-well ufabc-transparent">Prática: <a href="' + item.url +'" target="_blank">' + item.professor + '</a></div>';
                            } catch (err) {
                                item = hash_disciplinas[search];
                                html += '<div class="col-md-12 isHelp ufabc-extension-prof ufabc-well ufabc-transparent">Teoria: <a href="' + '#' +'" target="_blank">' + item.pratica + '</a></div>';
                            }
                          }
                        html += "</div>";
                        el.append(html);

                        //el.append('<div class="col-md-12 isHelp ufabc-extension-font"><div class="col-md-6 ufabc-well ufabc-green"><strong>CR ALUNO: </strong><span>' + item.cr_aluno + '</span></div><div class="col-md-6 ufabc-well ufabc-orange">CR PROFESSOR: ' + item.cr_professor +'</div><div class="col-md-6 ufabc-well ufabc-red">REPROVAÇÕES: ' + item.reprovacoes + '</div><div style="cursor: pointer;" class="col-md-6 pie ufabc-well ufabc-blue" data=' + JSON.stringify(item.pie) + '>ESTATÍSTICAS</div></div>')
                    } catch (err) {

                    }

                });

                // tenta criar todos os hover
                $('.isHelp').children('a').each(function() {
                    try {
                        var el = $(this);
                        var help_data = JSON.parse(el.parent().parent().attr('data'));
                        var type = el.parent().text().toLowerCase().indexOf('teoria');
                        var id = new Date().getTime() + parseInt(Math.random() * 8999 + 1000);;
                        var html, title;
                        if(type === -1) {
                            title = "PRÁTICA: " + el.text().toUpperCase();
                            html = generateHTMLPie(help_data.pratica_help, id);
                        } else {
                            title = "TEORIA: " + el.text().toUpperCase();
                            html = generateHTMLPie(help_data.teoria_help, id);
                        }

                        el.webuiPopover({
                            title: title,
                            content: html,
                            closeable:true,
                            trigger: 'hover',
                            placement: 'horizontal',
                            onShow: function($element) {
                                if(type === -1) {
                                    generatePie(help_data.pratica_help.pie, id);
                                } else {
                                    generatePie(help_data.teoria_help.pie, id);
                                }
                                
                            }
                        });

                        //generatePie(help_data.teoria_help, id);
                    } catch (err) {
                        //console.log('err');
                    }
                    
                });
                
            });
        });
    // carrega professores automaticamente
    $('#loadHelp').click();
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
                        // deprecated
                        // $.post(endpoint + 'simula', {disciplina_id: disciplina_id, aluno_id : aluno_id}, function( data ) {
                        //   var html = "(" + data.pos + "/" + data.total + ") ";
                        //   if (el.children('span').length) {
                        //     el.children('span').html(html);
                        //   } else {
                        //     el.html('<span style="color: red;">' + html + '</span> ' + el.text());
                        //   }
                          
                        // }); 
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

// injeta estilos proprios
function injectModal () {
    var div = document.createElement('div');
    div.innerHTML = modal_html;
    document.body.appendChild(div); 
}

function generateHTMLPie (info, id) {
    var html = "<canvas id='pie" + id + "'></canvas><br>";
    html += "<table class='table'><tbody><tr><td>CR Aluno</td><td><b>" + info.cr_aluno + "</b></td></tr><tr><td>CR Professor</td><td><b>" + info.cr_professor + "</b></td></tr><tr><td>Reprovacoes</td><td><b>" + info.reprovacoes + "</b></td></tr><tr><td>Trancamentos</td><td><b>" + info.trancamentos +"</b></td></tr></tbody></table>";
    return html;
}

function generatePie(item, id){
    var ctx = $("#pie" + id);

    console.log(ctx);

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

// pega todas as matriculas e manda para o servidor
function getAllMatriculas() {
    $.get('https://matricula.ufabc.edu.br/cache/matriculas.js', function (data) {
        try {
            data = JSON.parse(data.replace('matriculas=', '').replace(';', ''));
            // send this to the server
            if(Object.keys(data).length > 0) {
                $.post( endpoint + 'update_matriculas', {data: data}, function( data ) {
                    console.log(data);
                });
            }

        } catch (err) {
            getAllMatriculas();
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
                    $.post( endpoint + 'test', {data: item, aluno_id : aluno_id}, function( data ) {
                      $( ".result" ).html( data );
                    });
                }
                
            })
    })
}

function adicionaCortes() {
    $("#tabeladisciplinas tr td:nth-child(4)").each(function () {
        var el = $(this);
        el.append('<br><span href="#modalCortes" style="color: red; cursor: pointer;" id="openBtn" data-toggle="modal" class="corte ufabc-extension-prof" value="' + el.parent().attr('value') + '">Cortes</span>');
    });
}

function handlerCortes(){
    $('.corte').on('click', function (e) {
        
        getAlunoId(function (aluno_id) {
            $.post(endpoint + 'is_allowed', {aluno_id: aluno_id}, function( data ) {
                if(data == 'OK') {
                    var target = $(e.target);
                    var corte_id = target.attr('value');
                    var corpo = $('#tblGrid tbody');
                    corpo.parent().show();
                    var name = target.parent().parent().children()[2].innerText.split('|')[0];
                    $('.modal-title').text(name.split(")")[0] + ")");
                    var vagas = parseInt(target.parent().parent().children()[3].innerText);
                    corpo.html('');
                    $.post( endpoint + 'cortes', {disciplina_id: corte_id}, function( data ) {
                            data.map(function (item, i) {
                                // danger comes first
                                var classe = (i + 1) > vagas ? 'danger' : '';
                                classe = (item.id == aluno_id) ? ' warning' : classe; 
                                var rank_h = '<td>' + (i + 1) + '</td>';
                                var reserva_h = '<td>' + (item.reserva ? 'Sim' : 'Não') + '</td>';
                                var turno_h = '<td>' + item.turno + '</td>';
                                var ik_h = '<td>' + item.ik.toFixed(3) + '</td>';
                                var cr_h = '<td>' + item.cr.toFixed(3) + '</td>';
                                var cp_h = '<td>' + item.cp.toFixed(3) + '</td>';
                                corpo.append('<tr class="' + classe + '">' + rank_h + reserva_h + turno_h + ik_h + cp_h + cr_h + '</tr>');
                            })
                    });
                } else {
                    var target = $(e.target);
                    var corte_id = target.attr('value');
                    var corpo = $('#tblGrid tbody');
                    corpo.parent().hide();
                    $('.modal-title').html('Nao temos as disciplinas que voce cursou! <a href="https://aluno.ufabc.edu.br/" target="_blank"> Clique aqui</a> para carrega-las.' );
                    return;
                }
            });
        })

    })
}

var modal_html = '<div class="modal fade" id="modalCortes"> \
<div class="modal-dialog"> \
      <div class="modal-content"> \
        <div class="modal-header"> \
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button> \
          <h3 class="modal-title"></h3> \
        </div> \
        <div class="modal-body"> \
          <table class="table table-striped" id="tblGrid"> \
            <thead id="tblHead"> \
              <tr> \
                <th>Ranking</th> \
                <th>Reserva de vaga</th> \
                <th>Turno</th> \
                <th>Ik</th> \
                <th>CP</th> \
                <th>CR</th> \
              </tr> \
            </thead> \
            <tbody> \
              <tr><td></td> \
                <td></td> \
                <td class="text-right"></td> \
              </tr> \
            </tbody> \
          </table> \
        </div>   \
      </div><!-- /.modal-content --> \
    </div><!-- /.modal-dialog --> \
  </div><!-- /.modal -->'

function sameHandlers() {
    $('#andre').click(function (e) {
        if (!$('#andre').is(':checked')) {
            $("#tabeladisciplinas tr").each(function(){
                $(this).removeClass("notAndre");
            })
            return;
        } else {
            $("#tabeladisciplinas tr td:nth-child(3)").each(function(){
                var campus = $(this).text().split("(")[1].split(")")[0].toLowerCase();
                if(campus.indexOf('bernardo') != -1) {
                    // tem que sumir
                    $(this).parent().addClass("notAndre");
                }
            });
        }
    });

    $('#bernardo').click(function (e) {
        if (!$('#bernardo').is(':checked')) {
            $("#tabeladisciplinas tr").each(function(){
                $(this).removeClass("notBernardo");
            })
            return;
        } else {
            $("#tabeladisciplinas tr td:nth-child(3)").each(function(){
                var campus = $(this).text().split("(")[1].split(")")[0].toLowerCase();
                if(campus.indexOf('andr') != -1) {
                    // tem que sumir
                    $(this).parent().addClass("notBernardo");
                }
            });
        }
    });

    $('#fmatutino').click(function (e) {
        if (!$('#fmatutino').is(':checked')) {
            $("#tabeladisciplinas tr").each(function(){
                $(this).removeClass("notMatutino");
            })
            return;
        } else {
            $("#tabeladisciplinas tr td:nth-child(3)").each(function(){
                var campus = $(this).text().toLowerCase();
                if(campus.indexOf('noturno') != -1) {
                    // tem que sumir
                    $(this).parent().addClass("notMatutino");
                }
            });
        }
    });

    $('#fnoturno').click(function (e) {
        if (!$('#fnoturno').is(':checked')) {
            $("#tabeladisciplinas tr").each(function(){
                $(this).removeClass("notNoturno");
            })
            return;
        } else {
            $("#tabeladisciplinas tr td:nth-child(3)").each(function(){
                var campus = $(this).text().toLowerCase();
                if(campus.indexOf('matutino') != -1) {
                    // tem que sumir
                    $(this).parent().addClass("notNoturno");
                }
            });
        }
    });

    $("#cutHigh").bind('keyup mouseup', function () {
        var limit = parseFloat($("#cutHigh").val());
        $('.isHelp').parent().each(function(){
            try {
                var prof = JSON.parse($(this).attr('data'));
                if (prof.teoria && !prof.pratica) {
                    if (parseFloat(prof.teoria_help.cr_aluno) < limit) {
                        $(this).parent().parent().addClass('notHigh');
                    } else {
                        $(this).parent().parent().removeClass('notHigh');
                    };
                } else if (prof.pratica && !prof.teoria) {
                    if (parseFloat(prof.pratica_help.cr_aluno) < limit) {
                        $(this).parent().parent().addClass('notHigh');
                    } else {
                        $(this).parent().parent().removeClass('notHigh');
                    };
                } else {
                    if (parseFloat(prof.teoria_help.cr_aluno) < limit && parseFloat(prof.pratica_help.cr_aluno) < limit) {
                        $(this).parent().parent().addClass('notHigh');
                    } else {
                        $(this).parent().parent().removeClass('notHigh');
                    };
                }
            } catch (err) {

            }
        })
    });

    
}