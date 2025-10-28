// database.js - Sistema de gerenciamento de banco de dados online
class ChurchDatabase {
    constructor() {
        // URL base da API - você pode mudar para seu backend real
        this.baseURL = 'https://jsonplaceholder.typicode.com'; // URL de exemplo
        this.isConnected = false;
        this.pendingOperations = [];
        this.init();
    }

    init() {
        // Carregar configuração salva
        this.loadConfig();
        // Tentar conectar automaticamente
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

    // Testar conexão com o banco
    async testConnection() {
        try {
            this.updateStatus('Conectando...', 'connecting');
            
            this.saveConfig(); // Salvar URL atual

            // Teste simples de conexão
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

    // Salvar entrada no banco
    async saveEntrada(entradaData) {
        const operation = {
            type: 'entrada',
            data: entradaData,
            timestamp: new Date().toISOString()
        };

        // Se offline, armazenar localmente
        if (!this.isConnected) {
            this.storeOffline(operation);
            return { 
                success: true, 
                offline: true,
                message: 'Salvo localmente (modo offline)'
            };
        }

        try {
            // Simular envio para API real
            const response = await this.simulateApiCall('/entradas', 'POST', entradaData);
            
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
            // Se falhar, salvar offline
            this.storeOffline(operation);
            return { 
                success: true, 
                offline: true,
                message: 'Salvo localmente (erro de conexão)'
            };
        }
    }

    // Salvar saída no banco
    async saveSaida(saidaData) {
        const operation = {
            type: 'saida',
            data: saidaData,
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
            const response = await this.simulateApiCall('/saidas', 'POST', saidaData);
            
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

    // Carregar todas as transações
    async loadTransactions() {
        try {
            if (!this.isConnected) {
                // Carregar do localStorage se offline
                return this.loadFromLocalStorage();
            }

            // Simular carregamento da API
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

    // Deletar transação
    async deleteTransaction(type, id) {
        try {
            if (!this.isConnected) {
                // Deletar localmente se offline
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

    // ========== MÉTODOS AUXILIARES ==========

    // Simular chamada API (substituir por API real)
    async simulateApiCall(endpoint, method, data = null) {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Gerar ID único
        const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);
        
        // Simular resposta bem-sucedida
        return {
            success: true,
            id: generateId(),
            data: {
                entradas: this.loadFromLocalStorage().entradas,
                saidas: this.loadFromLocalStorage().saidas
            }
        };
    }

    // Armazenar operação offline
    storeOffline(operation) {
        const pending = this.getPendingOperations();
        pending.push(operation);
        localStorage.setItem('churchDB_pending', JSON.stringify(pending));
    }

    // Processar operações pendentes quando online
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

        // Limpar operações processadas
        localStorage.removeItem('churchDB_pending');
    }

    // Carregar operações pendentes
    getPendingOperations() {
        const pending = localStorage.getItem('churchDB_pending');
        return pending ? JSON.parse(pending) : [];
    }

    // Carregar do localStorage
    loadFromLocalStorage() {
        const saved = localStorage.getItem('churchFinance_data');
        if (saved) {
            return JSON.parse(saved);
        }
        return { entradas: [], saidas: [] };
    }

    // Salvar no localStorage
    saveToLocalStorage(data) {
        localStorage.setItem('churchFinance_data', JSON.stringify(data));
    }

    // Deletar localmente
    deleteLocal(type, id) {
        const data = this.loadFromLocalStorage();
        if (type === 'entradas') {
            data.entradas = data.entradas.filter(item => item.id !== id);
        } else if (type === 'saidas') {
            data.saidas = data.saidas.filter(item => item.id !== id);
        }
        this.saveToLocalStorage(data);
    }

    // Atualizar status na interface
    updateStatus(message, status) {
        const statusElement = document.getElementById('status-text');
        const statusContainer = document.getElementById('online-status');
        
        if (statusElement && statusContainer) {
            statusElement.textContent = message;
            statusContainer.className = `online-status ${status}`;
        }
    }

    // Exportar dados para backup
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

    // Limpar todos os dados
    clearData() {
        if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('churchFinance_data');
            localStorage.removeItem('churchDB_pending');
            return { success: true, message: 'Todos os dados foram limpos!' };
        }
        return { success: false, message: 'Operação cancelada' };
    }
}

// Instância global do banco de dados
const churchDB = new ChurchDatabase();