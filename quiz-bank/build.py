"""quiz-bank/*.py 원본을 모아 public/quiz-bank.json 문제 은행을 만듭니다.
사용: python3 quiz-bank/build.py  (용어 id 목록은 seed.json 기준으로 검사)"""
import json, os, sys, importlib, collections
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
import bank
for f in sorted(x for x in os.listdir(here) if x[:2].isdigit() and x.endswith('.py')):
    importlib.import_module(f[:-3])
qs = bank.QUESTIONS
terms = {t['id']: t['term'] for t in json.load(open(os.path.join(here, '..', 'seed.json')))}
per = collections.Counter(q['termId'] for q in qs)
errors = [f'용어 {i} {terms[i]}: {per[i]}문제' for i in terms if per[i] < 5]
errors += [f'없는 용어 id {i}' for i in per if i not in terms]
for q in qs:
    if len(set(q['options'])) != 4: errors.append('보기 중복: ' + q['q'])
dup = [k for k, v in collections.Counter(q['q'] for q in qs).items() if v > 1]
errors += ['문제 중복: ' + d for d in dup]
if errors: sys.exit('\n'.join(errors))
seen = collections.Counter(); out = []
for q in qs:
    seen[q['termId']] += 1
    qid = f"{q['termId']}-{seen[q['termId']]}"
    if qid in bank.ANSWERS: q['options'] = [bank.ANSWERS.pop(qid)] + q['options'][1:]
    if qid in bank.FIXES: q['options'] = q['options'][:1] + bank.FIXES.pop(qid)
    if len(set(q['options'])) != 4: sys.exit('보기 중복: ' + qid)
    out.append({'id': qid, 'termId': q['termId'], 'q': q['q'], 'options': q['options'], 'answer': 0, 'explain': q['explain']})
if bank.FIXES or bank.ANSWERS: sys.exit('없는 문제 id: ' + ', '.join([*bank.FIXES, *bank.ANSWERS]))
json.dump({'version': 1, 'note': '보기의 0번이 정답입니다. 출제할 때 보기 순서를 섞습니다.', 'questions': out},
          open(os.path.join(here, '..', 'public', 'quiz-bank.json'), 'w'), ensure_ascii=False, indent=1)
print(f'{len(out)}문제 · 용어 {len(per)}개 · 용어당 {min(per.values())}~{max(per.values())}문제')
