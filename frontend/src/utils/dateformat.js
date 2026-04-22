function toUTCString(localDatetime) {
    if (!localDatetime) return "";
    return new Date(localDatetime).toISOString();
}