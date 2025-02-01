from wikipedia2vec import Wikipedia2Vec
from flask import Flask, jsonify

model = Wikipedia2Vec.load('path/to/your/model_file')


app = Flask(__name__)

@app.route('/get_entity_vector/<entity>')
def get_entity_vector(entity):
    vector = model.get_entity_vector(entity).tolist()
    return jsonify(vector)

@app.route('/get_word_vector/<word>')
def get_word_vector(word):
    vector = model.get_word_vector(word).tolist()
    return jsonify(vector)

@app.route('/most_similar/<entity>')
def most_similar(entity):
    similar = model.most_similar(model.get_entity(entity))
    return jsonify([{'word': str(word), 'similarity': float(sim)} for word, sim in similar])

if __name__ == '__main__':
    app.run()
