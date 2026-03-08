
function validateAIResponse(text) {

const blocked = [
"hack",
"exploit",
"illegal",
"bypass"
];

for (let word of blocked) {
if (text.toLowerCase().includes(word)) {
return {
safe:false,
reason:"Unsafe instruction detected"
};
}
}

return {safe:true};

}

module.exports = {validateAIResponse};
