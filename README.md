# 모인 백엔드 과제

## 실행

- env
.env에 설정이 필요한것들을 변경 후 실행하시면 됩니다.
- server
$ yarn start
- dev db (dev 용이라 tmpfs옵션)
$ docker-compose up -d

## 구현 특이사항

- 주민등록번호는 비밀번호처럼 복호화할 필요 없을거로 판단
=> 똑같이 hash 단방향 암호화

- quote 와 transfer을 다른 entity로 구분할 필요?
=> 처리되었다는 column만 추가함으로서 구현할 수 있지만,
quote는 유저가 계속 자주 생성할 가능성이 높고 read가 findIndex로 자주 일어날것(그렇기에 uuid index로도 문제 없음)임에 비해
transfer은 quote에 비해 생성이 적고 range read가 많이 일어날 것으로 예상

- quote에 userId를 foreign key로 할 필요?
나중에 유저별 qoute 생성 기록을 보기위해 필요하다고 판단, 요구사항이 없다면 필요없을 것으로 판단

- quote entity에도 fee, usdamount 등 저장할 필요?
실시간 환율이 변하니까 해당 시간대에 usdAmount도 저장해놓는게 맞을 것으로 판단 (exchange rate는 JPY일 수 있으니)

- quoteId를 foreign key로 지정할 필요?
=> indexing이면 충분, 필요한상황이 따로 없을거로 판단

- create at, expire at 따로 둔 이유
=> expire time 이후 변경 고려

- quote에 대한 transfer요청 여러개 동시요청 방지
=> quoteId column unique

- transfer 여러개 동시 요청시 limit check에 대한 동시성 제어 필요
=> pessimistic lock transaction

- transform-res.interceptor.ts
=> response 형식을 resultCode, resultMsg 가 오도록 변환 + datetime 을 KST로 변환

- 개인적 경험으로는 unit test 보다는 e2e test로 각 api test를 선호합니다.
=> unit test는 TDD로 구현할 때 뚜렷한 요구사항 식별로 작은 단위로 각 요구사항을 나누게 되어 클린코드에 도움이 된다고 생각합니다만, 이전회사에서 요구사항이 지속적으로 변경되고 빠른 생산성이 강력하게 필요했기 때문에 이를 위해서는 큰틀에서 필요한 요구사항에 대한 api test작성 후 코드를 작성하는 것 도 좋았습니다. 이 또한 요구사항을 정확히 식별하는데 도움이 되었기도 합니다.
(한 예로 signup api에대한 e2e test를 간략하게 적어놓았습니다)

- express로만 monolithic server 개발경험이 있지만, nestjs 사용경험은 없어 이번에 docs를 쭉 읽어보았으나, 시간관계상 아직 전부 정독하지 못해 아쉽습니다. 함께하게 된다면 정독해서 더 나은 코드를 보일 수 있을 것 같습니다.
