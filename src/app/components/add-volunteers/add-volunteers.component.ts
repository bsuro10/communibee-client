import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {AuthService} from '../../services/communibee-backend/auth/auth.service';
import {VolunteeringOffersService} from '../../services/communibee-backend/volunteering-offers/volunteering-offers.service';
import {VolunteeringOffer} from '../../services/communibee-backend/volunteering-offers/volunteering-offer';
import {CategoryModel} from '../../services/communibee-backend/category/category';
import {ContentModel} from '../../services/communibee-backend/content/content';
import {ContentService} from '../../services/communibee-backend/content/content.service';
import {SubRegionsModel} from '../../services/communibee-backend/subregion/subregion';
import {SubRegionService} from '../../services/communibee-backend/subregion/subregion.service';


declare var $;

@Component({
  selector: 'app-add-volunteers',
  templateUrl: './add-volunteers.component.html',
  styleUrls: ['./add-volunteers.component.scss'],
})
export class AddVolunteersComponent implements OnInit {
  public myForm: FormGroup;
  regions: string[] = [] as any;
  categories: CategoryModel[];
  subRegions: SubRegionsModel[];
  content: ContentModel = {} as any;
  contentList: ContentModel[];
  information: string;
  contentCategory: any;
  isFileSelected = false;

  constructor(private subRegionsSrv: SubRegionService,
              private contentSrv: ContentService,
              private fb: FormBuilder,
              private vltrOffer: VolunteeringOffersService,
              private auth: AuthService,
              private router: Router) {
  }

  ngOnInit() {
    this.subRegionsSrv.getAll().then(subregions_res => {
      this.subRegions = subregions_res;
    });
    this.contentSrv.getAll().then(content_res => {
      this.contentList = content_res;
    });
    this.initForm();
  }

  initForm() {
    this.myForm = this.fb.group({
      title: ['', Validators.required],
      poc: this.fb.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        email: ['', Validators.email],
      }),
      numberOfVolunteers: ['', Validators.min(1)],
      availableContent: [''],
      multiOccurrence: [''],
      regions: [null],
    });
  }

  sendData() {
    const formValues = this.myForm.value;
    const volunteeringOffer: VolunteeringOffer = this.formValues2volunteeringOfferModel(formValues);

    this.vltrOffer.create(volunteeringOffer).then(volunteeringOfferDocument => {
      if (volunteeringOfferDocument) {
        this.router.navigateByUrl('/dashboard');
      }
    });
  }

  formValues2volunteeringOfferModel(formValues): VolunteeringOffer {
    console.log('forms values: ', formValues);
    const volunteeringOffer: VolunteeringOffer = {} as any;
    volunteeringOffer.title = formValues.title;
    volunteeringOffer.contact = formValues.poc;
    volunteeringOffer.numberOfVolunteers = formValues.numberOfVolunteers;
    volunteeringOffer.content = formValues.availableContent;
    if ( formValues.multiOccurrence === '' ) {
       volunteeringOffer.multiOccurrence = false;
    } else {
        volunteeringOffer.multiOccurrence = formValues.multiOccurrence;
    }
    volunteeringOffer.regions = formValues.regions;
    volunteeringOffer.createdByUserId = this.auth.getLocalUserId();

    return volunteeringOffer;
  }

  openContentModal() {
    this.isFileSelected = false;
    $('#modalContentUpload').modal('toggle');
  }

  onContentTitleLoaded(changedContent: ContentModel) {
    this.myForm.patchValue({
      availableContent: changedContent.title
    });
    this.content = changedContent;
    this.isFileSelected = true;
  }

  groupByFn(regionItem: SubRegionsModel) {
   return regionItem.region.name;
  }

  onChangeContent(selectedContent) {
    if (selectedContent == null) {
        this.isFileSelected = false;
    } else {
        this.isFileSelected = true;
    }
  }

}
