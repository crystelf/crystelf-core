import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty({ description: '访问核心的鉴权 token' })
  token: string;
}

export class GroupInfoDto extends TokenDto {
  @ApiProperty({ description: '群号', example: 114514 })
  groupId: number;
}

export class SendMessageDto extends GroupInfoDto {
  @ApiProperty({ description: '要发送的消息', example: 'Ciallo～(∠・ω< )⌒★' })
  message: string;
}

export class BroadcastDto extends TokenDto {
  @ApiProperty({
    description: '要广播的消息',
    example: '全体目光向我看齐！我宣布个事儿..',
  })
  message: string;
}
