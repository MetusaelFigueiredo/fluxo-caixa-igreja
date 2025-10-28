// app.js - Lógica principal do sistema de fluxo de caixa com login
class ChurchFinanceApp {
    constructor() {
        this.transactions = {
            entradas: [],
            saidas: []
        };
        this.init();
    }

    async init() {
        if (churchDB.userManager.estaLogado()) {
            this.mostrarSistema();
            this.setupEventListeners();
            this.setCurrentDate();
            await this.loadData();
            this.updateUI();
            this.setupTabs();
        } else {
            this.mostrarLogin();
        }
    }

    mostrarLogin() {
        document.body.innerHTML = `
            <div class="login-container">
                <div class="login-box">
                    <div class="login-header">
                        <i class="fas fa-church"></i>
                        <h1>Fluxo de Caixa - Igreja</h1>
                        <p>Faça login para acessar o sistema</p>
                    </div>
                    
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="login-usuario"><i class="fas fa-user"></i> Usuário</label>
                            <select id="login-usuario" required>
                                <option value="">Selecione seu usuário</option>
                                <option value="pastor">Pastor João</option>
                                <option value="tesoureiro">Irmão José (Tesoureiro)</option>
                                <option value="diacono">Diácono Pedro</option>
                                <option value="secretario">Irmã Maria (Secretária)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="login-senha"><i class="fas fa-lock"></i> Senha</label>
                            <input type="password" id="login-senha" required placeholder="Digite sua senha">
                        </div>
                        
                        <button type="submit" class="login-btn">
                            <i class="fas fa-sign-in-alt"></i> Entrar
                        </button>
                    </form>
                    
                    <div class="login-info">
                       <p><i class="fas fa-info-circle"></i> Entre em contato com o administrador para obter acesso</p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.fazerLogin();
        });
    }

    async fazerLogin() {
        const usuario = document.getElementById('login-usuario').value;
        const senha = document.getElementById('login-senha').value;

        const resultado = churchDB.userManager.fazerLogin(usuario, senha);
        
        if (resultado.success) {
            this.showNotification(`Bem-vindo, ${resultado.usuario.nome}!`, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            this.showNotification(resultado.error, 'error');
        }
    }

    fazerLogout() {
        if (confirm('Deseja sair do sistema?')) {
            churchDB.userManager.fazerLogout();
            this.mostrarLogin();
        }
    }

    mostrarSistema() {
        // Sistema normal já carregado pelo index.html
    }

    setupEventListeners() {
        document.getElementById('entrada-form').addEventListener('submit', async (e) => {
            await this.handleEntrada(e);
        });

        document.getElementById('saida-form').addEventListener('submit', async (e) => {
            await this.handleSaida(e);
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.form) {
                e.target.form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        });
    }

    setupTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async handleEntrada(e) {
        e.preventDefault();
        
        const entradaData = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            tipo: document.getElementById('tipo-entrada').value,
            valor: parseFloat(document.getElementById('valor-entrada').value),
            descricao: document.getElementById('descricao-entrada').value,
            data: document.getElementById('data-entrada').value,
            timestamp: new Date().toISOString()
        };

        if (!this.validateEntrada(entradaData)) return;

        this.setFormLoading('entrada-form', true);

        try {
            const result = await churchDB.saveEntrada(entradaData);
            
            if (result.success) {
                this.transactions.entradas.push(entradaData);
                churchDB.saveToLocalStorage(this.transactions);
                this.updateUI();
                this.showNotification(result.message, result.offline ? 'warning' : 'success');
                e.target.reset();
                this.setCurrentDate();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.showNotification('Erro ao salvar: ' + error.message, 'error');
        } finally {
            this.setFormLoading('entrada-form', false);
        }
    }

    async handleSaida(e) {
        e.preventDefault();
        
        const saidaData = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            categoria: document.getElementById('categoria-saida').value,
            valor: parseFloat(document.getElementById('valor-saida').value),
            descricao: document.getElementById('descricao-saida').value,
            data: document.getElementById('data-saida').value,
            timestamp: new Date().toISOString()
        };

        if (!this.validateSaida(saidaData)) return;

        this.setFormLoading('saida-form', true);

        try {
            const result = await churchDB.saveSaida(saidaData);
            
            if (result.success) {
                this.transactions.saidas.push(saidaData);
                churchDB.saveToLocalStorage(this.transactions);
                this.updateUI();
                this.showNotification(result.message, result.offline ? 'warning' : 'success');
                e.target.reset();
                this.setCurrentDate();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.showNotification('Erro ao salvar: ' + error.message, 'error');
        } finally {
            this.setFormLoading('saida-form', false);
        }
    }

    validateEntrada(entrada) {
        if (entrada.valor <= 0) {
            this.showNotification('O valor deve ser maior que zero', 'error');
            return false;
        }
        if (!entrada.descricao.trim()) {
            this.showNotification('A descrição é obrigatória', 'error');
            return false;
        }
        if (!entrada.tipo) {
            this.showNotification('Selecione o tipo de entrada', 'error');
            return false;
        }
        return true;
    }

    validateSaida(saida) {
        if (saida.valor <= 0) {
            this.showNotification('O valor deve ser maior que zero', 'error');
            return false;
        }
        if (!saida.descricao.trim()) {
            this.showNotification('A descrição é obrigatória', 'error');
            return false;
        }
        if (!saida.categoria) {
            this.showNotification('Selecione a categoria', 'error');
            return false;
        }
        return true;
    }

    async loadData() {
        try {
            const data = await churchDB.loadTransactions();
            this.transactions = data;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showNotification('Erro ao carregar dados salvos', 'error');
        }
    }

    updateUI() {
        this.updateUserInfo();
        this.updateDashboard();
        this.updateTransactionLists();
    }

    updateUserInfo() {
        const usuario = churchDB.userManager.getUsuarioLogado();
        if (usuario) {
            const statusElement = document.getElementById('online-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="fas fa-user"></i> 
                    ${usuario.nome} (${usuario.funcao})
                    <button onclick="app.fazerLogout()" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </button>
                `;
            }
        }
    }

    updateDashboard() {
        let totalCentral = 0;
        let totalLocal = 0;
        let totalMissao = 0;
        let totalConstrucao = 0;

        this.transactions.entradas.forEach(entrada => {
            if (entrada.tipo === 'dizimo-oferta') {
                totalCentral += entrada.valor * 0.6;
                totalLocal += entrada.valor * 0.4;
            } else if (entrada.tipo === 'santa-ceia') {
                totalMissao += entrada.valor;
            } else if (entrada.tipo === 'construcao') {
                totalConstrucao += entrada.valor;
            }
        });

        this.transactions.saidas.forEach(saida => {
            totalLocal -= saida.valor;
        });

        document.getElementById('central-value').textContent = this.formatCurrency(totalCentral);
        document.getElementById('local-value').textContent = this.formatCurrency(totalLocal);
        document.getElementById('missao-value').textContent = this.formatCurrency(totalMissao);
        document.getElementById('construcao-value').textContent = this.formatCurrency(totalConstrucao);
    }

    updateTransactionLists() {
        this.updateEntradasTable();
        this.updateSaidasTable();
    }

    updateEntradasTable() {
        const tbody = document.getElementById('entradas-body');
        
        if (this.transactions.entradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhuma entrada registrada</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const entradasOrdenadas = [...this.transactions.entradas].sort((a, b) => 
            new Date(b.data) - new Date(a.data)
        );

        tbody.innerHTML = entradasOrdenadas.map(entrada => {
            const tipoTexto = this.getTipoDescricao(entrada.tipo);
            const tipoIcon = this.getTipoIcon(entrada.tipo);
            
            return `
                <tr>
                    <td>${this.formatDate(entrada.data)}</td>
                    <td><i class="${tipoIcon}"></i> ${tipoTexto}</td>
                    <td>${entrada.descricao}</td>
                    <td><strong>${this.formatCurrency(entrada.valor)}</strong></td>
                    <td>
                        <button class="delete-btn" onclick="app.deleteEntrada('${entrada.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateSaidasTable() {
        const tbody = document.getElementById('saidas-body');
        
        if (this.transactions.saidas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhuma saída registrada</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const saidasOrdenadas = [...this.transactions.saidas].sort((a, b) => 
            new Date(b.data) - new Date(a.data)
        );

        tbody.innerHTML = saidasOrdenadas.map(saida => {
            return `
                <tr>
                    <td>${this.formatDate(saida.data)}</td>
                    <td>${saida.categoria}</td>
                    <td>${saida.descricao}</td>
                    <td><strong>${this.formatCurrency(saida.valor)}</strong></td>
                    <td>
                        <button class="delete-btn" onclick="app.deleteSaida('${saida.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteEntrada(id) {
        if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;

        try {
            const result = await churchDB.deleteTransaction('entradas', id);
            
            if (result.success) {
                this.transactions.entradas = this.transactions.entradas.filter(e => e.id !== id);
                churchDB.saveToLocalStorage(this.transactions);
                this.updateUI();
                this.showNotification('Entrada excluída!', 'success');
            }
        } catch (error) {
            this.showNotification('Erro ao excluir entrada', 'error');
        }
    }

    async deleteSaida(id) {
        if (!confirm('Tem certeza que deseja excluir esta saída?')) return;

        try {
            const result = await churchDB.deleteTransaction('saidas', id);
            
            if (result.success) {
                this.transactions.saidas = this.transactions.saidas.filter(s => s.id !== id);
                churchDB.saveToLocalStorage(this.transactions);
                this.updateUI();
                this.showNotification('Saída excluída!', 'success');
            }
        } catch (error) {
            this.showNotification('Erro ao excluir saída', 'error');
        }
    }

    getTipoDescricao(tipo) {
        const tipos = {
            'dizimo-oferta': 'Dízimo e Oferta',
            'construcao': 'Oferta Construção',
            'santa-ceia': 'Santa Ceia'
        };
        return tipos[tipo] || tipo;
    }

    getTipoIcon(tipo) {
        const icons = {
            'dizimo-oferta': 'fas fa-hand-holding-usd',
            'construcao': 'fas fa-hammer',
            'santa-ceia': 'fas fa-wine-glass'
        };
        return icons[tipo] || 'fas fa-question';
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('data-entrada').value = today;
        document.getElementById('data-saida').value = today;
    }

    setFormLoading(formId, isLoading) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]');
        
        if (isLoading) {
            form.classList.add('loading');
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            button.disabled = true;
        } else {
            form.classList.remove('loading');
            if (formId === 'entrada-form') {
                button.innerHTML = '<i class="fas fa-save"></i> Registrar Entrada';
            } else {
                button.innerHTML = '<i class="fas fa-save"></i> Registrar Saída';
            }
            button.disabled = false;
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    async testConnection() {
        const result = await churchDB.testConnection();
        this.showNotification(
            result.success ? result.message : result.error,
            result.success ? 'success' : 'error'
        );
    }

    exportData() {
        const result = churchDB.exportData();
        this.showNotification(result.message, 'success');
    }

    clearData() {
        const result = churchDB.clearData();
        if (result.success) {
            this.transactions = { entradas: [], saidas: [] };
            this.updateUI();
            this.showNotification(result.message, 'success');
        }
    }
}

const app = new ChurchFinanceApp();