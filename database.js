// database.js - Sistema de gerenciamento de banco de dados online com usuários
class UserManager {
    constructor() {
        this.usuarios = this.carregarUsuarios();
        this.usuarioLogado = null;
    }

    carregarUsuarios() {
        // Usuários padrão - pode ser alterado posteriormente
        const usuariosPadrao = [
            { 
                id: 'pastor', 
                senha: 'pastor123', 
                nome: 'Pastor João', 
                funcao: 'Liderança',
                email: 'pastor@igreja.com'
            },
            { 
                id: 'tesoureiro', 
                senha: 'tesouro456', 
                nome: 'Irmão José', 
                funcao: 'Tesoureiro',
                email: 'tesoureiro@igreja.com'
            },
            { 
                id: 'diacono', 
                senha: 'diacono789', 
                nome: 'Diácono Pedro', 
                funcao: 'Diácono',
                email: 'diacono@igreja.com'
            },
            { 
                id: 'secretario', 
                senha: 'secret123', 
                nome: 'Irmã Maria', 
                funcao: 'Secretária',
                email: 'secretaria@igreja.com'
            }
        ];

        // Tentar carregar usuários personalizados, senão usar os padrão
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

    fazerLogout() {
        this.usuarioLogado = null;
        localStorage.removeItem('churchLoggedUser');
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

    alterarSenha(usuarioId, senhaAtual, novaSenha) {
        const usuario = this.usuarios.find(u => u.id === usuarioId);
        
        if (usuario && usuario.senha === senhaAtual) {
            usuario.senha = novaSenha;
            this.salvarUsuarios();
            return { success: true };
        } else {
            return { success: false, error: 'Senha atual incorreta' };
        }
    }

    adicionarUsuario(novoUsuario) {
        if (this.usuarios.find(u => u.id === novoUsuario.id)) {
            return { success: false, error: 'ID de usuário já existe' };
        }
        
        this.usuarios.push(novoUsuario);
        this.salvarUsuarios();
        return { success: true };
    }

    // ⭐⭐ ADICIONE ESTA FUNÇÃO AQUI ⭐⭐ - NO FINAL DA CLASSE UserManager
    recuperarLogin() {
        const saved = localStorage.getItem('churchLoggedUser');
        if (saved) {
            this.usuarioLogado = JSON.parse(saved);
            return this.usuarioLogado;
        }
        return null;
    }
}

// ⚠️⚠️ A classe ChurchDatabase começa AQUI - a função acima deve estar ANTES desta linha ⚠️⚠️
class ChurchDatabase {
    constructor() {
        this.userManager = new UserManager();
        this.baseURL = 'https://jsonplaceholder.typicode.com';
        this.isConnected = false;
        this.pendingOperations = [];
        this.init();
    }

    init() {
        this.loadConfig();
        this.testConnection();
    }

    loadConfig() {
        const savedURL = localStorage.getItem('churchDB_url');
        if (savedURL) {
            this.baseURL = savedURL;
            document.getElementById('db-url').value = savedURL;
        }
    }

    saveConfig() {
        const dbURL = document.getElementById('db-url').value;
        if (dbURL) {
            this.baseURL = dbURL;
            localStorage.setItem('churchDB_url', dbURL);
        }
    }

    async testConnection() {
        try {
            this.updateStatus('Conectando...', 'connecting');
            
            this.saveConfig();

            const response = await fetch(`${this.baseURL}/posts/1`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            this.isConnected = response.ok;
            
            if (this.isConnected) {
                this.updateStatus('Online - Salvando em tempo real', 'online');
                this.processPendingOperations();
                return { success: true, message: 'Conectado ao banco de dados!' };
            } else {
                throw new Error('Servidor não respondeu corretamente');
            }
            
        } catch (error) {
            this.isConnected = false;
            this.updateStatus('Offline - Dados locais', 'offline');
            return { 
                success: false, 
                error: `Erro de conexão: ${error.message}` 
            };
        }
    }

    async saveEntrada(entradaData) {
        const usuario = this.userManager.getUsuarioLogado();
        const operation = {
            type: 'entrada',
            data: {
                ...entradaData,
                registradoPor: usuario ? usuario.id : 'anonimo',
                registradoPorNome: usuario ? usuario.nome : 'Anônimo'
            },
            timestamp: new Date().toISOString()
        };

        if (!this.isConnected) {
            this.storeOffline(operation);
            return { 
                success: true, 
                offline: true,
                message: 'Salvo localmente (modo offline)'
            };
        }

        try {
            const response = await this.simulateApiCall('/entradas', 'POST', operation.data);
            
            if (response.success) {
                return { 
                    success: true, 
                    id: response.id,
                    message: 'Entrada salva com sucesso!'
                };
            } else {
                throw new Error('Erro ao salvar no servidor');
            }
            
        } catch (error) {
            this.storeOffline(operation);
            return { 
                success: true, 
                offline: true,
                message: 'Salvo localmente (erro de conexão)'
            };
        }
    }

    async saveSaida(saidaData) {
        const usuario = this.userManager.getUsuarioLogado();
        const operation = {
            type: 'saida',
            data: {
                ...saidaData,
                registradoPor: usuario ? usuario.id : 'anonimo',
                registradoPorNome: usuario ? usuario.nome : 'Anônimo'
            },
            timestamp: new Date().toISOString()
        };

        if (!this.isConnected) {
            this.storeOffline(operation);
            return { 
                success: true, 
                offline: true,
                message: 'Salvo localmente (modo offline)'
            };
        }

        try {
            const response = await this.simulateApiCall('/saidas', 'POST', operation.data);
            
            if (response.success) {
                return { 
                    success: true, 
                    id: response.id,
                    message: 'Saída salva com sucesso!'
                };
            } else {
                throw new Error('Erro ao salvar no servidor');
            }
            
        } catch (error) {
            this.storeOffline(operation);
            return { 
                success: true, 
                offline: true,
                message: 'Salvo localmente (erro de conexão)'
            };
        }
    }

    async loadTransactions() {
        try {
            if (!this.isConnected) {
                return this.loadFromLocalStorage();
            }

            const response = await this.simulateApiCall('/transactions', 'GET');
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error('Erro ao carregar dados');
            }
            
        } catch (error) {
            console.warn('Usando dados locais:', error.message);
            return this.loadFromLocalStorage();
        }
    }

    async deleteTransaction(type, id) {
        try {
            if (!this.isConnected) {
                this.deleteLocal(type, id);
                return { success: true, offline: true };
            }

            const response = await this.simulateApiCall(`/${type}/${id}`, 'DELETE');
            return { success: response.success };
            
        } catch (error) {
            this.deleteLocal(type, id);
            return { success: true, offline: true };
        }
    }

    async simulateApiCall(endpoint, method, data = null) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);
        
        return {
            success: true,
            id: generateId(),
            data: {
                entradas: this.loadFromLocalStorage().entradas,
                saidas: this.loadFromLocalStorage().saidas
            }
        };
    }

    storeOffline(operation) {
        const pending = this.getPendingOperations();
        pending.push(operation);
        localStorage.setItem('churchDB_pending', JSON.stringify(pending));
    }

    async processPendingOperations() {
        const pending = this.getPendingOperations();
        if (pending.length === 0) return;

        console.log(`Processando ${pending.length} operações pendentes...`);
        
        for (const operation of pending) {
            try {
                if (operation.type === 'entrada') {
                    await this.saveEntrada(operation.data);
                } else if (operation.type === 'saida') {
                    await this.saveSaida(operation.data);
                }
            } catch (error) {
                console.error('Erro ao processar operação pendente:', error);
            }
        }

        localStorage.removeItem('churchDB_pending');
    }

    getPendingOperations() {
        const pending = localStorage.getItem('churchDB_pending');
        return pending ? JSON.parse(pending) : [];
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('churchFinance_data');
        if (saved) {
            return JSON.parse(saved);
        }
        return { entradas: [], saidas: [] };
    }

    saveToLocalStorage(data) {
        localStorage.setItem('churchFinance_data', JSON.stringify(data));
    }

    deleteLocal(type, id) {
        const data = this.loadFromLocalStorage();
        if (type === 'entradas') {
            data.entradas = data.entradas.filter(item => item.id !== id);
        } else if (type === 'saidas') {
            data.saidas = data.saidas.filter(item => item.id !== id);
        }
        this.saveToLocalStorage(data);
    }

    updateStatus(message, status) {
        const statusElement = document.getElementById('status-text');
        const statusContainer = document.getElementById('online-status');
        
        if (statusElement && statusContainer) {
            statusElement.textContent = message;
            statusContainer.className = `online-status ${status}`;
        }
    }

    exportData() {
        const data = this.loadFromLocalStorage();
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
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
            localStorage.removeItem('churchFinance_data');
            localStorage.removeItem('churchDB_pending');
            return { success: true, message: 'Todos os dados foram limpos!' };
        }
        return { success: false, message: 'Operação cancelada' };
    }
}

    // 🔐 FUNÇÃO GLOBAL PARA LOGOUT - 100% FUNCIONAL
    logoutGlobal() {
        if (confirm('Deseja sair do sistema?')) {
            this.userManager.fazerLogout();
            location.reload();
        }
    }
    
const churchDB = new ChurchDatabase();