const selectVehicle = (weightKg) => {
    const kg = parseFloat(weightKg);
    if (kg <= 30) return 'BIKE';
    if (kg <= 60) return 'SCOOTER';
    return 'TEMPO';
};

module.exports = selectVehicle;