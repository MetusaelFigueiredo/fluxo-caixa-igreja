// database.js - Sistema completo com Google Sheets
class UserManager {
    constructor() {
        this.usuarios = this.carregarUsuarios();
        this.usuarioLogado = null;
    }

    carregarUsuarios() {
        const usuariosPadrao = [
            { 
                id: 'pastor', 
                senha: 'pastor123', 
                nome: 'Pastor João', 
                funcao: 'Liderança'
            },
            { 
                id: 'tesoureiro', 
                senha: 'tesouro456', 
                nome: 'Irmão José', 
                funcao: 'Tesoureiro'
            },
            { 
                id: 'diacono', 
                senha: 'diacono789', 
                nome: 'Diácono Pedro', 
                funcao: 'Diácono'
            }
        ];

        const usuariosSalvos = localStorage.getItem('churchUsers');
        return usuariosSalvos ? JSON.parse(usuariosSalvos) : usuariosPadrao;
    }

    salvarUsuarios() {
        localStorage.setItem('churchUsers', JSON.stringify(this.usuarios));
    }

    fazerLogin(usuarioId, senha) {
        const usuario = this.usuarios.find(u => u.id === usuarioId && u.senha === senha);
        
        if (usuario) {
            this.usuarioLogado = usuario;
            localStorage.setItem('churchLoggedUser', JSON.stringify(usuario));
            return { success: true, usuario };
        } else {
            return { success: false, error: 'Usuário ou senha incorretos' };
        }
    }

    getUsuarioLogado() {
        if (!this.usuarioLogado) {
            const saved = localStorage.getItem('churchLoggedUser');
            this.usuarioLogado = saved ? JSON.parse(saved) : null;
        }
        return this.usuarioLogado;
    }

    estaLogado() {
        return this.getUsuarioLogado() !== null;
    }
}

class GoogleSheetsManager {
    constructor() {
        this.scriptURL = '';
        this.sheetsId = '';
        this.carregarConfig();
    }

    carregarConfig() {
        this.scriptURL = localStorage.getItem('churchSheetsScriptURL') || '';
        this.sheetsId = localStorage.getItem('churchSheetsID') || '';
    }

    salvarConfig(scriptURL, sheetsId) {
        this.scriptURL = scriptURL;
        this.sheetsId = sheetsId;
        localStorage.setItem('churchSheetsScriptURL', scriptURL);
        localStorage.setItem('churchSheetsID', sheetsId);
    }

    async enviarParaSheets(aba, dados) {
        if (!this.scriptURL || !this.sheetsId) {
            return { success: false, error: 'Google Sheets não configurado' };
        }

        try {
            const response = await fetch(this.scriptURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'salvar_dados',
                    sheetsId: this.sheetsId,
                    aba: aba,
                    dados: dados
                })
            });

            const resultado = await response.json();
            return resultado;
            
        } catch (error) {
            return { success: false, error: 'Erro de conexão: ' + error.message };
        }
    }

    async buscarDeSheets(aba) {
        if (!this.scriptURL || !this.sheetsId) {
            return { success: false, error: 'Google Sheets não configurado' };
        }

        try {
            const response = await fetch(this.scriptURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'buscar_dados',
                    sheetsId: this.sheetsId,
                    aba: aba
                })
            });

            const resultado = await response.json();
            return resultado;
            
        } catch (error) {
            return { success: false, error: 'Erro de conexão: ' + error.message };
        }
    }

    async criarPlanilha() {
        if (!this.scriptURL) {
            return { success: false, error: 'Google Apps Script não configurado' };
        }

        try {
            const response = await fetch(this.scriptURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'criar_planilha'
                })
            });

            const resultado = await response.json();
            
            if (resultado.success) {
                this.sheetsId = resultado.sheetsId;
                localStorage.setItem('churchSheetsID', this.sheetsId);
            }
            
            return resultado;
            
        } catch (error) {
            return { success: false, error: 'Erro ao criar planilha: ' + error.message };
        }
    }
}

class ChurchDatabase {
    constructor() {
        this.userManager = new UserManager();
        this.sheetsManager = new GoogleSheetsManager();
        this.init();
    }

    init() {
        if (this.sheetsManager.sheetsId) {
            this.sincronizarComSheets();
        }
    }

    async sincronizarComSheets() {
        try {
            const entradasResult = await this.sheetsManager.buscarDeSheets('Entradas');
            const saidasResult = await this.sheetsManager.buscarDeSheets('Saidas');
            
            if (entradasResult.success) {
                this.salvarLocalmente('entradas', entradasResult.dados);
            }
            if (saidasResult.success) {
                this.salvarLocalmente('saidas', saidasResult.dados);
            }
            
        } catch (error) {
            console.warn('Erro na sincronização:', error);
        }
    }

    async saveEntrada(entradaData) {
        const usuario = this.userManager.getUsuarioLogado();
        const dadosCompletos = {
            ...entradaData,
            registradoPor: usuario ? usuario.nome : 'Anônimo',
            dataRegistro: new Date().toISOString()
        };

        this.salvarLocalmente('entradas', dadosCompletos);

        if (this.sheetsManager.sheetsId) {
            const resultado = await this.sheetsManager.enviarParaSheets('Entradas', dadosCompletos);
            if (resultado.success) {
                return { 
                    success: true, 
                    message: 'Entrada salva localmente e no Google Sheets!' 
                };
            }
        }

        return { 
            success: true, 
            message: 'Entrada salva localmente' 
        };
    }

    async saveSaida(saidaData) {
        const usuario = this.userManager.getUsuarioLogado();
        const dadosCompletos = {
            ...saidaData,
            registradoPor: usuario ? usuario.nome : 'Anônimo',
            dataRegistro: new Date().toISOString()
        };

        this.salvarLocalmente('saidas', dadosCompletos);

        if (this.sheetsManager.sheetsId) {
            const resultado = await this.sheetsManager.enviarParaSheets('Saidas', dadosCompletos);
            if (resultado.success) {
                return { 
                    success: true, 
                    message: 'Saída salva localmente e no Google Sheets!' 
                };
            }
        }

        return { 
            success: true, 
            message: 'Saída salva localmente' 
        };
    }

    salvarLocalmente(tipo, dados) {
        const chave = `churchFinance_${tipo}`;
        const dadosAtuais = this.carregarLocalmente(tipo);
        dadosAtuais.push(dados);
        localStorage.setItem(chave, JSON.stringify(dadosAtuais));
    }

    carregarLocalmente(tipo) {
        const chave = `churchFinance_${tipo}`;
        const dados = localStorage.getItem(chave);
        return dados ? JSON.parse(dados) : [];
    }

    async loadTransactions() {
        const entradas = this.carregarLocalmente('entradas');
        const saidas = this.carregarLocalmente('saidas');
        
        return { entradas, saidas };
    }

    async deleteTransaction(type, id) {
        const dados = this.carregarLocalmente(type);
        const dadosAtualizados = dados.filter(item => item.id !== id);
        localStorage.setItem(`churchFinance_${type}`, JSON.stringify(dadosAtualizados));
        
        return { success: true };
    }

    configurarSheets(scriptURL, sheetsId) {
        this.sheetsManager.salvarConfig(scriptURL, sheetsId);
        return { success: true, message: 'Google Sheets configurado!' };
    }

    async criarNovaPlanilha() {
        return await this.sheetsManager.criarPlanilha();
    }

    exportData() {
        const entradas = this.carregarLocalmente('entradas');
        const saidas = this.carregarLocalmente('saidas');
        const dadosCompletos = { entradas, saidas };
        
        const blob = new Blob([JSON.stringify(dadosCompletos, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-igreja-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, message: 'Backup exportado com sucesso!' };
    }

    clearData() {
        if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('churchFinance_entradas');
            localStorage.removeItem('churchFinance_saidas');
            return { success: true, message: 'Todos os dados foram limpos!' };
        }
        return { success: false, message: 'Operação cancelada' };
    }
}

const churchDB = new ChurchDatabase();
