export class LocalStorage {
    public constructor() { }

    public setItem( propertyName: string, value: any ) {

        if (this.isInBrowser()) {
            localStorage.setItem( propertyName, value );
        }
    }

    public getItem(propertyName: string): any {
        return this.isInBrowser() ? localStorage.getItem( propertyName ) : '';
    }

    public removeItem(propertyName: string) {

        if (this.isInBrowser()) {
            localStorage.removeItem( propertyName );
        }
    }

    private isInBrowser(): boolean {
        return typeof window !== 'undefined';
    }
}
