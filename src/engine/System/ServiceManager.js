import { GameLoopManager } from './GameLoopManager.js';
import { PassiveRegenerationSystem } from './PassiveRegenerationSystem.js';

export class ServiceManager {
    constructor() {
        this.services = new Map();
        this.initializationOrder = [];
        this.isInitialized = false;
    }

    /**
     * Реєструє сервіс з пріоритетом ініціалізації
     * @param {string} name - назва сервісу
     * @param {Function} factory - фабрика для створення сервісу
     * @param {number} priority - пріоритет (чим менше, тим раніше)
     * @param {Array} dependencies - залежності (назви сервісів)
     */
    register(name, factory, priority = 0, dependencies = []) {
        if (this.services.has(name)) {
            console.warn(`Service ${name} already registered. Overwriting.`);
        }

        this.services.set(name, {
            name,
            factory,
            priority,
            dependencies,
            instance: null,
            initialized: false
        });

        this.updateInitializationOrder();
    }

    /**
     * Оновлює порядок ініціалізації на основі пріоритетів та залежностей
     */
    updateInitializationOrder() {
        const services = Array.from(this.services.values());
        
        // Топологічне сортування для залежностей
        const sorted = this.topologicalSort(services);
        
        // Сортування за пріоритетом всередині кожного рівня залежностей
        this.initializationOrder = sorted.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Топологічне сортування для залежностей
     */
    topologicalSort(services) {
        const visited = new Set();
        const result = [];
        const visiting = new Set();

        const visit = (service) => {
            if (visiting.has(service.name)) {
                throw new Error(`Circular dependency detected: ${service.name}`);
            }
            if (visited.has(service.name)) {
                return;
            }

            visiting.add(service.name);
            
            for (const depName of service.dependencies) {
                const depService = this.services.get(depName);
                if (!depService) {
                    throw new Error(`Dependency ${depName} not found for service ${service.name}`);
                }
                visit(depService);
            }

            visiting.delete(service.name);
            visited.add(service.name);
            result.push(service);
        };

        for (const service of services) {
            visit(service);
        }

        return result;
    }

    /**
     * Ініціалізує всі сервіси в правильному порядку
     * @param {Object} context - контекст для передачі сервісам
     */
    async initialize(context = {}) {
        if (this.isInitialized) {
            console.warn('ServiceManager already initialized');
            return;
        }

        console.log('Initializing services...');
        
        for (const serviceConfig of this.initializationOrder) {
            try {
                console.log(`Initializing service: ${serviceConfig.name}`);
                
                // Передаємо залежності в контекст
                const serviceContext = { ...context };
                for (const depName of serviceConfig.dependencies) {
                    const depService = this.services.get(depName);
                    if (depService && depService.initialized) {
                        serviceContext[depName] = depService.instance;
                    }
                }

                // Створюємо екземпляр сервісу
                serviceConfig.instance = await serviceConfig.factory(serviceContext);
                serviceConfig.initialized = true;
                
                console.log(`Service ${serviceConfig.name} initialized successfully`);
            } catch (error) {
                console.error(`Failed to initialize service ${serviceConfig.name}:`, error);
                throw error;
            }
        }

        this.isInitialized = true;
        console.log('All services initialized successfully');
    }

    /**
     * Отримує сервіс за назвою
     * @param {string} name - назва сервісу
     * @returns {*} екземпляр сервісу
     */
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found`);
        }
        if (!service.initialized) {
            throw new Error(`Service ${name} not initialized`);
        }
        return service.instance;
    }

    /**
     * Перевіряє, чи ініціалізовано сервіс
     * @param {string} name - назва сервісу
     * @returns {boolean}
     */
    isInitialized(name) {
        const service = this.services.get(name);
        return service ? service.initialized : false;
    }

    /**
     * Отримує список всіх сервісів
     * @returns {Array}
     */
    getServices() {
        return Array.from(this.services.values()).map(service => ({
            name: service.name,
            initialized: service.initialized,
            priority: service.priority,
            dependencies: service.dependencies
        }));
    }

    /**
     * Видаляє сервіс
     * @param {string} name - назва сервісу
     */
    remove(name) {
        const service = this.services.get(name);
        if (service && service.instance) {
            // Якщо у сервісу є метод destroy, викликаємо його
            if (typeof service.instance.destroy === 'function') {
                try {
                    service.instance.destroy();
                } catch (error) {
                    console.error(`Error destroying service ${name}:`, error);
                }
            }
        }
        
        this.services.delete(name);
        this.updateInitializationOrder();
    }

    /**
     * Очищує всі сервіси
     */
    clear() {
        for (const service of this.services.values()) {
            if (service.instance && typeof service.instance.destroy === 'function') {
                try {
                    service.instance.destroy();
                } catch (error) {
                    console.error(`Error destroying service ${service.name}:`, error);
                }
            }
        }
        
        this.services.clear();
        this.initializationOrder = [];
        this.isInitialized = false;
    }

    /**
     * Отримує статистику сервісів
     */
    getStats() {
        const stats = {
            totalServices: this.services.size,
            initializedServices: 0,
            pendingServices: 0,
            services: []
        };

        for (const service of this.services.values()) {
            if (service.initialized) {
                stats.initializedServices++;
            } else {
                stats.pendingServices++;
            }

            stats.services.push({
                name: service.name,
                initialized: service.initialized,
                priority: service.priority,
                dependencies: service.dependencies
            });
        }

        return stats;
    }
}
