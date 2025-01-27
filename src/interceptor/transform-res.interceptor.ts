import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { formatToKST } from './format';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformResInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // get response status
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => ({
        resultCode: response.statusCode,
        resultMsg: response.statusCode == 200 ? 'OK' : response.message,
        ...this.transformDates(data),
      })),
    );
  }

  private transformDates(data: any): any {
    if (data === null || data === undefined) return data;
    if (data instanceof Date) {
      return formatToKST(data);
    } else if (Array.isArray(data)) {
      return data.map((item) => this.transformDates(item));
    } else if (typeof data === 'object') {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = this.transformDates(data[key]);
        return acc;
      }, {});
    }

    return data;
  }
}
