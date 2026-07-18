import os


DATA_FILE = "data.json"
UPLOAD_FOLDER = "uploads"
IMAGE_FOLDER = os.path.join(UPLOAD_FOLDER,"images")
AUDIO_FOLDER = os.path.join(UPLOAD_FOLDER,"audio")

FIELDS = [
            {
                "name": "title",
                "label": "Title",
                "type": "text",
                "required": True
            },
            {
                "name": "meaning",
                "label": "Meaning",
                "type": "textarea"
            },
            {
                "name": "phonetic",
                "label": "IPA",
                "type": "text"
            },
            {
                "name": "example",
                "label": "Example",
                "type": "textarea"
            },
            {
                "name": "note",
                "label": "Note",
                "type": "textarea"
            },
            {
                "name": "image",
                "label": "Image",
                "type": "image"
            },
            {
                "name": "audio",
                "label": "Audio",
                "type": "audio"
            },
            {
                "name": "synonyms",
                "label": "Synonyms",
                "type": "tags"
            },
            {
                "name": "antonyms",
                "label": "Antonyms",
                "type": "tags"
            }
        ]

NODE_TYPES = [
                "topic",
                "idea",
                "vocabulary",
                "grammar",
                "note",
                "question"
            ]

