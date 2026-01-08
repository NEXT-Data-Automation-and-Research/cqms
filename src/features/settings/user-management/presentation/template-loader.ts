/**
 * Template Loader - Dynamically loads HTML templates
 */

import { logError } from '../../../../utils/logging-helper.js';

export async function loadTemplate(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load template: ${path}`);
    }
    return await response.text();
}

export async function insertTemplate(containerId: string, templatePath: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
        throw new Error(`Container not found: ${containerId}`);
    }
    const html = await loadTemplate(templatePath);
    container.innerHTML = html;
}

export async function loadAllTemplates(): Promise<void> {
    const basePath = '/src/features/settings/user-management/presentation/templates/';
    
    try {
        // Load statistics section
        await insertTemplate('statisticsContainer', `${basePath}statistics-section.html`);
        
        // Load modals
        await insertTemplate('modalsContainer', `${basePath}edit-user-modal.html`);
        const bulkModal = await loadTemplate(`${basePath}bulk-upload-modal.html`);
        const createModal = await loadTemplate(`${basePath}create-user-modal.html`);
        
        const modalsContainer = document.getElementById('modalsContainer');
        if (modalsContainer) {
            modalsContainer.innerHTML += bulkModal + createModal;
        }
    } catch (error) {
        logError('[TemplateLoader] Failed to load templates:', error);
    }
}

