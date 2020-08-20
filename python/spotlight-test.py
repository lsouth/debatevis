import spotlight
import requests
from pprint import pprint
from IPython.core.display import display, HTML

# An API Error Exception
class APIError(Exception):
    def __init__(self, status):
            self.status = status
    def __str__(self):
            return "APIError: status={}".format(self.status)

    # Base URL for Spotlight API
    base_url = "http://api.dbpedia-spotlight.org/en/annotate"
    # Parameters
    # 'text' - text to be annotated
    # 'confidence' -   confidence score for linking
    params = {"text": "I’m not new to the political process; I was making a contribution as the speaker of the third largest and most diverse state in the country well before I even got into the Senate. I would add to that that this election cannot be a resume competition. It’s important to be qualified, but if this election is a resume competition, then Hillary Clinton’s gonna be the next president, because she’s been in office and in government longer than anybody else running here tonight. This country is facing an economy that has been radically transformed. You know, the largest retailer in the country and the world today, Amazon, doesn’t even own a single store? And these changes have been disruptive. They have changed people’s lives. The jobs that once sustained our middle class, they either don’t pay enough or they are gone, and we need someone that understands that as our nominee. If I’m our nominee, how is Hillary Clinton gonna lecture me about living paycheck to paycheck? I was raised paycheck to paycheck. How is she — how is she gonna lecture me — how is she gonna lecture me about student loans? I owed over $100,000 just four years ago. If I’m our nominee, we will be the party of the future."
, "confidence": 0.35}
    # Response content type
    headers = {'accept': 'text/html'}
    # GET Request
    res = requests.get(base_url, params=params, headers=headers)
    if res.status_code != 200:
        # Something went wrong
        raise APIError(res.status_code)
    # Display the result as HTML in Jupyter Notebook
    display(HTML(res.text))
