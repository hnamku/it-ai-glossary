QUESTIONS = []
def Q(term_id, q, answer, w1, w2, w3, explain):
    QUESTIONS.append({'termId': term_id, 'q': q, 'options': [answer, w1, w2, w3], 'explain': explain})
FIXES = {}
def F(qid, w1, w2, w3):
    FIXES[qid] = [w1, w2, w3]
ANSWERS = {}
def A(qid, answer):
    ANSWERS[qid] = answer
