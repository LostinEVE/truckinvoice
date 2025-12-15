let accessoryCounter = 0;

export function setupAccessories() {
    const addAccessoryBtn = document.getElementById('addAccessoryBtn');
    if (!addAccessoryBtn) return;
    addAccessoryBtn.addEventListener('click', addAccessoryField);
}

function addAccessoryField() {
    const container = document.getElementById('accessoriesContainer');
    if (!container) return;

    const accessoryId = `accessory-${accessoryCounter++}`;

    const accessoryDiv = document.createElement('div');
    accessoryDiv.className = 'accessory-item';
    accessoryDiv.id = accessoryId;

    accessoryDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Description:</label>
                <input type="text" class="accessory-description" placeholder="e.g., Detention, Lumper Fee, Extra Stop" required>
            </div>
            <div class="form-group">
                <label>Amount ($):</label>
                <input type="number" step="0.01" class="accessory-amount" placeholder="50.00" required>
            </div>
            <button type="button" class="btn-remove-accessory" data-accessory-id="${accessoryId}">Remove</button>
        </div>
    `;

    // Attach remove handler without relying on inline onclick
    const removeBtn = accessoryDiv.querySelector('.btn-remove-accessory');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => removeAccessory(accessoryId));
    }

    container.appendChild(accessoryDiv);
}

export function removeAccessory(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

export function getAccessories() {
    const accessories = [];
    const items = document.querySelectorAll('.accessory-item');

    items.forEach(item => {
        const description = item.querySelector('.accessory-description')?.value;
        const amount = item.querySelector('.accessory-amount')?.value;

        if (description && amount) {
            accessories.push({
                description,
                amount: parseFloat(amount).toFixed(2)
            });
        }
    });

    return accessories;
}
